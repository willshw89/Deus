//=============================================================================
// UF_Proficiency.js - Unified SRD 5.1 + DEUS Capability & Proficiency Architecture
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Proficiency] Creative Commons SRD 5.1 ability check framework, unified capability calculation, bounded proficiency ranks, deterministic routine work rates, discrete d20 checks, and emergent professions.
 * @author UF project
 * @base UF_World
 * @base UF_Items
 * @orderAfter UF_World
 * @orderAfter UF_Items
 *
 * @help
 * Implements the unified creature capability architecture:
 * ABILITY + LEARNED PROFICIENCY + TRAITS + TOOLS + EQUIPMENT + CONDITION + CIRCUMSTANCE = CAPABILITY
 *
 * The six SRD abilities (STR, DEX, CON, INT, WIS, CHA) form the universal
 * statistical foundation across combat, crafting, gathering, construction,
 * medicine, research, governance, and exploration.
 *
 * Proficiency Ranks:
 * - Untrained (+0)
 * - Familiar (+1)
 * - Proficient (+2)
 * - Expert (+3)
 * - Master (+4)
 * - Grandmaster (+5)
 *
 * Routine work uses deterministic capability formulas (zero d20 spam).
 * Discrete d20 checks are strictly triggered for meaningful uncertainty.
 *
 * API:
 *   UF.Proficiency.rank(unit, profId) -> { rank, bonus, xp, nextXp, label }
 *   UF.Proficiency.resolveCapability(unit, profId, abilityKey, opts) -> { capability, abilityMod, profBonus, toolBonus, conditionMod }
 *   UF.Proficiency.workRate(unit, abilityKey, profId, opts) -> Number
 *   UF.Proficiency.check(unit, profId, abilityKey, dc, opts) -> { ok, total, roll, capability, dc, critical, fumble }
 *   UF.Proficiency.gainXp(unit, profId, amount, difficulty) -> { gained, newXp, oldRank, newRank, rankedUp }
 *   UF.Proficiency.emergentProfession(unit) -> { id, title, domain, primaryProf, description }
 *   UF.Proficiency.migrateLegacySkills(unit) -> Boolean
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};

    const emit = (name, ...args) => {
        if (root.UF && root.UF.Events && root.UF.Events.emit) root.UF.Events.emit(name, ...args);
    };
    const World = () => (root.UF && root.UF.World) || null;
    const Items = () => (root.UF && root.UF.Items) || null;

    const Proficiency = {};
    root.UF.Proficiency = Proficiency;

    // -------------------------------------------------------------------------
    // Bounded Proficiency Ranks & XP Thresholds
    // -------------------------------------------------------------------------

    const RANKS = [
        { id: "untrained",   bonus: 0, minXp: 0,      maxXp: 99,       label: "Untrained" },
        { id: "familiar",    bonus: 1, minXp: 100,    maxXp: 499,      label: "Familiar" },
        { id: "proficient",  bonus: 2, minXp: 500,    maxXp: 1999,     label: "Proficient" },
        { id: "expert",      bonus: 3, minXp: 2000,   maxXp: 4999,     label: "Expert" },
        { id: "master",      bonus: 4, minXp: 5000,   maxXp: 9999,     label: "Master" },
        { id: "grandmaster", bonus: 5, minXp: 10000,  maxXp: Infinity, label: "Grandmaster" }
    ];

    Proficiency.RANKS = RANKS;

    // -------------------------------------------------------------------------
    // Canonical Unified Proficiencies Registry
    // -------------------------------------------------------------------------

    const PROFICIENCY_DEFINITIONS = {
        // SRD 5.1 Core Skills
        athletics:        { id: "athletics",        name: "Athletics",        defaultAbility: "str", category: "physical", srd: true },
        acrobatics:       { id: "acrobatics",       name: "Acrobatics",       defaultAbility: "dex", category: "physical", srd: true },
        sleight_of_hand:  { id: "sleight_of_hand",  name: "Sleight of Hand",  defaultAbility: "dex", category: "physical", srd: true },
        stealth:          { id: "stealth",          name: "Stealth",          defaultAbility: "dex", category: "physical", srd: true },
        arcana:           { id: "arcana",           name: "Arcana",           defaultAbility: "int", category: "mental",   srd: true },
        history:          { id: "history",          name: "History",          defaultAbility: "int", category: "mental",   srd: true },
        investigation:    { id: "investigation",    name: "Investigation",    defaultAbility: "int", category: "mental",   srd: true },
        nature:           { id: "nature",           name: "Nature",           defaultAbility: "int", category: "mental",   srd: true },
        religion:         { id: "religion",         name: "Religion",         defaultAbility: "int", category: "mental",   srd: true },
        animal_handling:  { id: "animal_handling",  name: "Animal Handling",  defaultAbility: "wis", category: "practical",srd: true },
        insight:          { id: "insight",          name: "Insight",          defaultAbility: "wis", category: "social",   srd: true },
        medicine:         { id: "medicine",         name: "Medicine",         defaultAbility: "wis", category: "practical",srd: true },
        perception:       { id: "perception",       name: "Perception",       defaultAbility: "wis", category: "practical",srd: true },
        survival:         { id: "survival",         name: "Survival",         defaultAbility: "wis", category: "practical",srd: true },
        deception:        { id: "deception",        name: "Deception",        defaultAbility: "cha", category: "social",   srd: true },
        intimidation:     { id: "intimidation",     name: "Intimidation",     defaultAbility: "cha", category: "social",   srd: true },
        performance:      { id: "performance",      name: "Performance",      defaultAbility: "cha", category: "social",   srd: true },
        persuasion:       { id: "persuasion",       name: "Persuasion",       defaultAbility: "cha", category: "social",   srd: true },

        // Technical Trade & Production Proficiencies
        mining:           { id: "mining",           name: "Mining",           defaultAbility: "str", category: "trade" },
        woodcutting:      { id: "woodcutting",      name: "Woodcutting",      defaultAbility: "str", category: "trade" },
        carpentry:        { id: "carpentry",        name: "Carpentry",        defaultAbility: "dex", category: "trade" },
        masonry:          { id: "masonry",          name: "Masonry",          defaultAbility: "str", category: "trade" },
        smithing:         { id: "smithing",         name: "Smithing",         defaultAbility: "str", category: "trade" },
        fletching:        { id: "fletching",        name: "Fletching",        defaultAbility: "dex", category: "trade" },
        farming:          { id: "farming",          name: "Farming",          defaultAbility: "wis", category: "trade" },
        cooking:          { id: "cooking",          name: "Cooking",          defaultAbility: "wis", category: "trade" },
        tanning:          { id: "tanning",          name: "Tanning",          defaultAbility: "con", category: "trade" },
        leatherworking:   { id: "leatherworking",   name: "Leatherworking",   defaultAbility: "dex", category: "trade" },
        weaving:          { id: "weaving",          name: "Weaving",          defaultAbility: "dex", category: "trade" },
        pottery:          { id: "pottery",          name: "Pottery",          defaultAbility: "dex", category: "trade" },
        engineering:      { id: "engineering",      name: "Engineering",      defaultAbility: "int", category: "trade" },

        // Combat Weapon & Armor Proficiencies
        simple_weapons:   { id: "simple_weapons",   name: "Simple Weapons",   defaultAbility: "str", category: "combat" },
        martial_weapons:  { id: "martial_weapons",  name: "Martial Weapons",  defaultAbility: "str", category: "combat" },
        ranged_weapons:   { id: "ranged_weapons",   name: "Ranged Weapons",   defaultAbility: "dex", category: "combat" },
        shields:          { id: "shields",          name: "Shields",          defaultAbility: "str", category: "combat" },
        light_armor:      { id: "light_armor",      name: "Light Armor",      defaultAbility: "dex", category: "combat" },
        medium_armor:     { id: "medium_armor",     name: "Medium Armor",     defaultAbility: "dex", category: "combat" },
        heavy_armor:      { id: "heavy_armor",      name: "Heavy Armor",      defaultAbility: "str", category: "combat" }
    };

    Proficiency.DEFINITIONS = PROFICIENCY_DEFINITIONS;

    // -------------------------------------------------------------------------
    // Contextual Ability Selection per Action
    // -------------------------------------------------------------------------

    const ACTION_ABILITY_MAPPING = {
        // Carpentry
        "carpentry:frame":        "str",
        "carpentry:heavy_beams":  "str",
        "carpentry:joinery":      "dex",
        "carpentry:fine_carving": "dex",
        "carpentry:layout":       "int",
        "carpentry:rot_inspect":  "wis",

        // Masonry
        "masonry:quarry":         "str",
        "masonry:heavy_blocks":   "str",
        "masonry:ashlar_dress":   "dex",
        "masonry:arch_calc":      "int",
        "masonry:mortar_mix":     "con",

        // Mining
        "mining:excavate":        "str",
        "mining:endurance":       "con",
        "mining:vein_find":       "wis",
        "mining:strata_analysis": "int",
        "mining:fine_chipping":   "dex",

        // Woodcutting
        "woodcutting:fell":       "str",
        "woodcutting:buck":       "str",
        "woodcutting:direction":  "wis",
        "woodcutting:endurance":  "con",

        // Smithing
        "smithing:forge_heavy":   "str",
        "smithing:heat_manage":   "wis",
        "smithing:fine_blade":    "dex",
        "smithing:alloy_calc":    "int",

        // Medicine
        "medicine:first_aid":     "wis",
        "medicine:surgery":       "dex",
        "medicine:herbal_cure":   "int",
        "medicine:quarantine":    "wis"
    };

    Proficiency.actionAbility = function(actionKey, fallbackAbility = "str") {
        return ACTION_ABILITY_MAPPING[actionKey] || fallbackAbility;
    };

    // -------------------------------------------------------------------------
    // Core Proficiency Rank & XP Accessors
    // -------------------------------------------------------------------------

    function proficiencyStore(unit) {
        if (!unit || !unit.data) return {};
        if (!unit.data.proficiencyXp || typeof unit.data.proficiencyXp !== "object") {
            unit.data.proficiencyXp = {};
        }
        return unit.data.proficiencyXp;
    }

    Proficiency.xp = function(unit, profId) {
        const store = proficiencyStore(unit);
        return typeof store[profId] === "number" ? store[profId] : 0;
    };

    Proficiency.rank = function(unit, profId) {
        const currentXp = Proficiency.xp(unit, profId);
        for (let i = RANKS.length - 1; i >= 0; i--) {
            const r = RANKS[i];
            if (currentXp >= r.minXp) {
                const nextRank = RANKS[i + 1] || null;
                return {
                    id: r.id,
                    bonus: r.bonus,
                    label: r.label,
                    xp: currentXp,
                    minXp: r.minXp,
                    maxXp: r.maxXp,
                    nextXp: nextRank ? nextRank.minXp : Infinity
                };
            }
        }
        return Object.assign({}, RANKS[0], { xp: 0, nextXp: RANKS[1].minXp });
    };

    Proficiency.bonus = function(unit, profId) {
        return Proficiency.rank(unit, profId).bonus;
    };

    // -------------------------------------------------------------------------
    // Unified Capability Resolver
    // ABILITY + PROFICIENCY + TRAITS + TOOLS + EQUIPMENT + CONDITION = CAPABILITY
    // -------------------------------------------------------------------------

    Proficiency.resolveCapability = function(unit, profId, abilityKey = null, opts = {}) {
        if (!unit || !unit.data) {
            return { capability: 0, abilityMod: 0, profBonus: 0, toolBonus: 0, conditionMod: 0, total: 0 };
        }

        const def = PROFICIENCY_DEFINITIONS[profId] || null;
        const abKey = abilityKey || (opts.action && ACTION_ABILITY_MAPPING[opts.action]) || (def ? def.defaultAbility : "str");

        // 1. Ability Modifier: floor((score - 10) / 2)
        const stats = unit.data.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
        const score = typeof stats[abKey] === "number" ? stats[abKey] : 10;
        const abilityMod = (root.UF && root.UF.Rules && typeof root.UF.Rules.modifier === "function")
            ? root.UF.Rules.modifier(score)
            : Math.floor((score - 10) / 2);

        // 2. Proficiency Bonus: +0 to +5
        const prof = Proficiency.rank(unit, profId);
        let profBonus = prof.bonus;

        // 3. Tool & Equipment Bonus: +0 to +3
        let toolBonus = 0;
        const I = Items();
        if (I && unit.data.equipment && unit.data.equipment.tool) {
            const toolItem = I.get(unit.data.equipment.tool);
            if (toolItem && toolItem.holder === unit.id) {
                const t = I.type(toolItem.type);
                if (t && t.tool) {
                    const quality = toolItem.q || toolItem.quality || 0;
                    if (quality >= 5) toolBonus = 3;       // Masterwork
                    else if (quality >= 3) toolBonus = 2;  // Superior
                    else if (quality >= 1) toolBonus = 1;  // Good quality
                    else toolBonus = 0;                    // Standard / crude
                }
            }
        }
        if (opts.toolBonus !== undefined) toolBonus = opts.toolBonus;

        // 4. Traits & Feat Modifiers
        let traitMod = 0;
        if (unit.data.traits && Array.isArray(unit.data.traits)) {
            if (unit.data.traits.includes("meticulous") && (profId === "carpentry" || profId === "masonry")) traitMod += 1;
            if (unit.data.traits.includes("keen_eye") && (profId === "perception" || profId === "investigation")) traitMod += 1;
            if (unit.data.traits.includes("brawny") && (profId === "athletics" || profId === "mining")) traitMod += 1;
        }

        // 5. Conditions & Circumstances (Exhaustion, Injury, Morale)
        let conditionMod = 0;
        const needs = unit.data.needs;
        if (needs) {
            // Exhaustion / Sleep Deprivation
            if (needs.sleep && needs.sleep >= 90) conditionMod -= 2;
            else if (needs.sleep && needs.sleep >= 75) conditionMod -= 1;

            // Severe Starvation
            if (needs.hunger && needs.hunger >= 90) conditionMod -= 2;
            else if (needs.hunger && needs.hunger >= 75) conditionMod -= 1;
        }
        if (opts.circumstanceMod !== undefined) conditionMod += opts.circumstanceMod;

        // Total Bounded Capability Score: strictly -2 to +12
        const rawCapability = abilityMod + profBonus + toolBonus + traitMod + conditionMod;
        const capability = Math.max(-2, Math.min(12, rawCapability));

        return {
            capability,
            rawCapability,
            abilityKey: abKey,
            abilityScore: score,
            abilityMod,
            profBonus,
            profRank: prof.id,
            profLabel: prof.label,
            toolBonus,
            traitMod,
            conditionMod
        };
    };

    // -------------------------------------------------------------------------
    // Deterministic Routine Work Rate (No D20 Spam)
    // -------------------------------------------------------------------------

    Proficiency.workRate = function(unit, abilityKey, profId, opts = {}) {
        const resolved = Proficiency.resolveCapability(unit, profId, abilityKey, opts);
        const cap = resolved.capability;

        // Base work rate at capability 0 is 1.0 units/sec.
        // Each point of capability scales effective speed by +15%.
        // Negative capability scales down smoothly: cap -2 -> 0.70x, cap 0 -> 1.0x, cap +10 -> 2.50x
        let multiplier = 1.0 + (cap * 0.15);
        if (multiplier < 0.25) multiplier = 0.25;

        // Tool effectiveness multiplier if applicable
        if (opts.toolMultiplier && opts.toolMultiplier > 0) {
            multiplier *= opts.toolMultiplier;
        }

        return Math.round(multiplier * 100) / 100;
    };

    // -------------------------------------------------------------------------
    // Discrete D20 Check Engine (For Meaningful Uncertainty)
    // -------------------------------------------------------------------------

    let testRollOverride = null;
    Proficiency._setTestRoll = function(roll) { testRollOverride = roll; };
    Proficiency._clearTestRoll = function() { testRollOverride = null; };

    Proficiency.check = function(unit, profId, abilityKey = null, dc = 10, opts = {}) {
        const resolved = Proficiency.resolveCapability(unit, profId, abilityKey, opts);

        // Roll 1d20 (or use deterministic test override if set)
        let roll = testRollOverride !== null ? testRollOverride : (Math.floor(Math.random() * 20) + 1);

        // Advantage / Disadvantage
        if (opts.advantage && !opts.disadvantage && testRollOverride === null) {
            const r2 = Math.floor(Math.random() * 20) + 1;
            roll = Math.max(roll, r2);
        } else if (opts.disadvantage && !opts.advantage && testRollOverride === null) {
            const r2 = Math.floor(Math.random() * 20) + 1;
            roll = Math.min(roll, r2);
        }

        const total = roll + resolved.capability;
        const critical = roll === 20;
        const fumble = roll === 1;
        const ok = critical ? true : (fumble ? false : total >= dc);
        const margin = total - dc;

        const result = {
            ok,
            total,
            roll,
            capability: resolved.capability,
            details: resolved,
            dc,
            margin,
            critical,
            fumble
        };

        emit("proficiency:check", unit, profId, result);
        return result;
    };

    // -------------------------------------------------------------------------
    // Diminishing Returns Experience Progression & Knowledge Transfer
    // -------------------------------------------------------------------------

    Proficiency.gainXp = function(unit, profId, baseAmount = 10, difficulty = "routine") {
        if (!unit || !unit.data) return { gained: 0, newXp: 0, rankedUp: false };
        const store = proficiencyStore(unit);
        const currentXp = store[profId] || 0;
        const oldRank = Proficiency.rank(unit, profId);

        // Diminishing returns scaling:
        // High rank practicing trivial tasks earns sharply diminished XP
        let mult = 1.0;
        if (oldRank.id === "expert" && difficulty === "routine") mult = 0.5;
        else if (oldRank.id === "master" && difficulty === "routine") mult = 0.2;
        else if (oldRank.id === "grandmaster" && difficulty === "routine") mult = 0.05;
        else if (oldRank.id === "untrained" && difficulty === "challenging") mult = 1.5;

        // Teacher / Master Apprentice Knowledge Transfer Bonus
        if (unit.data.mentorId) {
            const W = World();
            const mentor = W ? W.unit(unit.data.mentorId) : null;
            if (mentor) {
                const mentorRank = Proficiency.rank(mentor, profId);
                if (mentorRank.bonus > oldRank.bonus) {
                    mult += 0.5; // +50% apprenticeship bonus
                }
            }
        }

        const gained = Math.max(1, Math.round(baseAmount * mult));
        const newXp = currentXp + gained;
        store[profId] = newXp;

        const newRank = Proficiency.rank(unit, profId);
        const rankedUp = newRank.bonus > oldRank.bonus;

        if (rankedUp) {
            emit("proficiency:rankUp", unit, profId, oldRank, newRank);
        }

        return {
            gained,
            newXp,
            oldRank: oldRank.id,
            newRank: newRank.id,
            rankedUp
        };
    };

    // -------------------------------------------------------------------------
    // Emergent Descriptive Professions
    // -------------------------------------------------------------------------

    const PROFESSION_PROFILES = [
        { id: "master_carpenter",  title: "Master Carpenter",  minRank: 4, prof: "carpentry",       domain: "construction" },
        { id: "journeyman_builder",title: "Carpenter",         minRank: 2, prof: "carpentry",       domain: "construction" },
        { id: "master_mason",      title: "Master Stonemason", minRank: 4, prof: "masonry",         domain: "construction" },
        { id: "stonemason",        title: "Stonemason",        minRank: 2, prof: "masonry",         domain: "construction" },
        { id: "master_smith",      title: "Master Blacksmith", minRank: 4, prof: "smithing",        domain: "metallurgy" },
        { id: "blacksmith",        title: "Blacksmith",        minRank: 2, prof: "smithing",        domain: "metallurgy" },
        { id: "quarrymaster",      title: "Quarrymaster",      minRank: 4, prof: "mining",          domain: "extraction" },
        { id: "miner",             title: "Miner",             minRank: 2, prof: "mining",          domain: "extraction" },
        { id: "forester",          title: "Veteran Forester",  minRank: 3, prof: "woodcutting",     domain: "forestry" },
        { id: "woodcutter",        title: "Woodcutter",        minRank: 1, prof: "woodcutting",     domain: "forestry" },
        { id: "physician",         title: "Chief Physician",   minRank: 4, prof: "medicine",        domain: "healthcare" },
        { id: "healer",            title: "Healer",            minRank: 2, prof: "medicine",        domain: "healthcare" },
        { id: "master_fletcher",   title: "Master Fletcher",   minRank: 3, prof: "fletching",       domain: "crafting" },
        { id: "husbandman",        title: "Husbandman",        minRank: 2, prof: "farming",         domain: "agriculture" },
        { id: "chef",              title: "Cook",              minRank: 2, prof: "cooking",         domain: "subsistence" },
        { id: "leatherworker",     title: "Leatherworker",     minRank: 2, prof: "leatherworking",  domain: "crafting" },
        { id: "scout",             title: "Veteran Scout",     minRank: 3, prof: "survival",        domain: "exploration" },
        { id: "veteran_soldier",   title: "Veteran Soldier",   minRank: 3, prof: "martial_weapons", domain: "military" },
        { id: "guard",             title: "Militia Guard",     minRank: 1, prof: "simple_weapons",  domain: "military" }
    ];

    Proficiency.emergentProfession = function(unit) {
        if (!unit || !unit.data) return { id: "laborer", title: "Laborer", domain: "general" };

        let bestCandidate = null;
        let bestBonus = -1;
        let bestXp = -1;

        for (const p of PROFESSION_PROFILES) {
            const r = Proficiency.rank(unit, p.prof);
            if (r.bonus >= p.minRank) {
                if (r.bonus > bestBonus || (r.bonus === bestBonus && r.xp > bestXp)) {
                    bestBonus = r.bonus;
                    bestXp = r.xp;
                    bestCandidate = {
                        id: p.id,
                        title: p.title,
                        domain: p.domain,
                        primaryProf: p.prof,
                        rankLabel: r.label,
                        rankBonus: r.bonus
                    };
                }
            }
        }

        if (bestCandidate) return bestCandidate;
        return { id: "settler", title: "Settler", domain: "general", rankLabel: "Untrained", rankBonus: 0 };
    };

    // -------------------------------------------------------------------------
    // Legacy 1-99 Skill Migration & Backward Compatibility
    // -------------------------------------------------------------------------

    Proficiency.migrateLegacySkills = function(unit) {
        if (!unit || !unit.data) return false;
        let migrated = false;
        const store = proficiencyStore(unit);

        // 1. Migrate unit.data.skillXp (OSRS 1-99 XP table)
        if (unit.data.skillXp && typeof unit.data.skillXp === "object") {
            for (const [legacyId, xpVal] of Object.entries(unit.data.skillXp)) {
                let targetProf = legacyId;
                if (legacyId === "woodcutting") targetProf = "woodcutting";
                else if (legacyId === "mining") targetProf = "mining";
                else if (legacyId === "carpentry") targetProf = "carpentry";
                else if (legacyId === "masonry") targetProf = "masonry";
                else if (legacyId === "smithing") targetProf = "smithing";
                else if (legacyId === "fletching") targetProf = "fletching";
                else if (legacyId === "farming") targetProf = "farming";
                else if (legacyId === "cooking") targetProf = "cooking";
                else if (legacyId === "leatherwork" || legacyId === "tanning") targetProf = "leatherworking";
                else if (legacyId === "healing") targetProf = "medicine";
                else if (legacyId === "hunting" || legacyId === "foraging") targetProf = "survival";
                else if (legacyId === "attack" || legacyId === "strength") targetProf = "martial_weapons";
                else if (legacyId === "defence") targetProf = "shields";
                else if (legacyId === "ranged") targetProf = "ranged_weapons";

                // Map exponential OSRS XP (0 to 13M) to bounded continuous proficiency XP (0 to 12,000)
                // Level 1 = 0 XP, Level 50 = 1,000 XP (Proficient), Level 80 = 5,000 XP (Master), Level 99 = 10,000 XP (Grandmaster)
                const numericXp = typeof xpVal === "number" ? xpVal : 0;
                let mappedXp = Math.min(12000, Math.round(Math.sqrt(numericXp) * 2.8));
                if (mappedXp > (store[targetProf] || 0)) {
                    store[targetProf] = mappedXp;
                    migrated = true;
                }
            }
        }

        // 2. Migrate unit.data.skills (0-5 rating)
        if (unit.data.skills && typeof unit.data.skills === "object") {
            const skillRankMap = [0, 100, 500, 2000, 5000, 10000];
            for (const [legacyId, tier] of Object.entries(unit.data.skills)) {
                const targetProf = legacyId === "healing" ? "medicine" : legacyId;
                const tierVal = Math.max(0, Math.min(5, tier | 0));
                const mappedXp = skillRankMap[tierVal];
                if (mappedXp > (store[targetProf] || 0)) {
                    store[targetProf] = mappedXp;
                    migrated = true;
                }
            }
        }

        if (migrated) {
            emit("proficiency:migrated", unit);
        }
        return migrated;
    };

    // Auto-migrate on world load / unit registration
    if (root.UF && root.UF.Events) {
        root.UF.Events.on("world:unitAdded", unit => {
            Proficiency.migrateLegacySkills(unit);
        });
    }

})();
