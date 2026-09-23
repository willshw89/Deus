//=============================================================================
// DEUS_Dnd5e.js - D&D 5.1 SRD Ability Scores, Classes, Feats & Spellbook Engine
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Dnd5e] D&D 5.1 SRD ability rolling (4d6 drop lowest), 12 core classes, feats, proficiencies, and arcane/divine spellbook engine.
 * @author UF project
 * @base DEUS_World
 * @help
 * Implements D&D 5.1 System Reference Document (SRD 5.1) CC-BY-4.0 mechanics:
 * - 4d6 drop lowest ability score rolling (STR, DEX, CON, INT, WIS, CHA: 3–20).
 * - 12 core classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin,
 *   Ranger, Rogue, Sorcerer, Warlock, Wizard.
 * - Class eligibility matching based on primary abilities.
 * - Level 1 Hit Die, Max HP, Armor Class, Proficiency Bonus (+2).
 * - Saving throw proficiencies and skill proficiencies.
 * - Level 1 class features and feats.
 * - Arcane vs Divine spellcasting classification, spell slots, known cantrips,
 *   and 1st-level spells for Baldur's Gate 1 style Spell Book & Priest Scroll.
 *
 * Attribution Notice:
 * This work includes material taken from the System Reference Document 5.1
 * ("SRD 5.1") by Wizards of the Coast LLC and available at
 * https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is
 * licensed under the Creative Commons Attribution 4.0 International License
 * available at https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * API:
 *   UF.Dnd5e.rollAbilityScores(seed, unitId, species, stage)
 *   UF.Dnd5e.assignClass(stats, seed, unitId)
 *   UF.Dnd5e.classDef(classId)
 *   UF.Dnd5e.allClasses()
 *   UF.Dnd5e.spellDef(spellId)
 *   UF.Dnd5e.formatMod(score)
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.DEUS = root.DEUS || {};
    root.UF = root.DEUS;

    const STAT_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
    const SALT_DND_STATS = 0x57a7;
    const SALT_DND_CLASS = 0xc1a5;

    // Deterministic Mulberry32 PRNG
    function mulberry32(a) {
        return function() {
            let t = (a += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash32(...args) {
        let h = 2166136261 >>> 0;
        for (const a of args) {
            const n = typeof a === "string" ? hashString(a) : (Number(a) | 0);
            h ^= n & 0xffffffff;
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }

    function hashString(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        return h;
    }

    function statMod(score) {
        return Math.floor((score - 10) / 2);
    }

    function formatMod(score) {
        const m = statMod(score);
        return m >= 0 ? `+${m}` : `${m}`;
    }

    // SRD 5.1 12 Core Classes Catalog
    const DND_CLASSES = {
        barbarian: {
            id: "barbarian",
            name: "Barbarian",
            hitDie: 12,
            primaryAbility: ["str"],
            savingThrows: ["str", "con"],
            armorProficiencies: ["Light armor", "Medium armor", "Shields"],
            weaponProficiencies: ["Simple weapons", "Martial weapons"],
            skillChoices: { count: 2, from: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"] },
            skills: ["Athletics", "Perception", "Survival"],
            features: [
                { name: "Rage", desc: "Enter a battle rage for resistance to physical damage and +2 melee damage (2/day)." },
                { name: "Unarmored Defense", desc: "While not wearing armor, AC equals 10 + DEX mod + CON mod." }
            ],
            casterType: null,
            spellAbility: null
        },
        bard: {
            id: "bard",
            name: "Bard",
            hitDie: 8,
            primaryAbility: ["cha"],
            savingThrows: ["dex", "cha"],
            armorProficiencies: ["Light armor"],
            weaponProficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
            skillChoices: { count: 3, from: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"] },
            skills: ["Performance", "Persuasion", "Deception", "Acrobatics"],
            features: [
                { name: "Spellcasting", desc: "Channel arcane spells through song, music, and dramatic recitation." },
                { name: "Bardic Inspiration", desc: "Inspire allies within 60 ft with a d6 bonus die (CHA mod times/day)." }
            ],
            casterType: "arcane",
            spellAbility: "cha",
            spellSlots: { 1: { max: 2, current: 2 } },
            defaultCantrips: ["Vicious Mockery", "Dancing Lights"],
            defaultSpells: ["Charm Person", "Cure Wounds", "Dissonant Whispers", "Sleep"]
        },
        cleric: {
            id: "cleric",
            name: "Cleric",
            hitDie: 8,
            primaryAbility: ["wis"],
            savingThrows: ["wis", "cha"],
            armorProficiencies: ["Light armor", "Medium armor", "Shields"],
            weaponProficiencies: ["Simple weapons"],
            skillChoices: { count: 2, from: ["History", "Insight", "Medicine", "Persuasion", "Religion"] },
            skills: ["Insight", "Religion", "Medicine"],
            features: [
                { name: "Spellcasting", desc: "Cast divine prayers bestowed by divine power or spiritual deity." },
                { name: "Divine Domain", desc: "Embody the celestial domain of Life and Sun; enhanced healing and miracles." }
            ],
            casterType: "divine",
            spellAbility: "wis",
            spellSlots: { 1: { max: 2, current: 2 } },
            defaultCantrips: ["Sacred Flame", "Guidance", "Thaumaturgy"],
            defaultSpells: ["Bless", "Cure Wounds", "Healing Word", "Guiding Bolt", "Sanctuary"]
        },
        druid: {
            id: "druid",
            name: "Druid",
            hitDie: 8,
            primaryAbility: ["wis"],
            savingThrows: ["int", "wis"],
            armorProficiencies: ["Light armor", "Medium armor", "Shields (non-metal)"],
            weaponProficiencies: ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"],
            skillChoices: { count: 2, from: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"] },
            skills: ["Nature", "Survival", "Animal Handling"],
            features: [
                { name: "Druidic", desc: "Know the ancient secret language of druids." },
                { name: "Spellcasting", desc: "Harness the primal essence of the earth, beasts, and weather." }
            ],
            casterType: "divine",
            spellAbility: "wis",
            spellSlots: { 1: { max: 2, current: 2 } },
            defaultCantrips: ["Druidcraft", "Produce Flame", "Shillelagh"],
            defaultSpells: ["Entangle", "Goodberry", "Faerie Fire", "Healing Word"]
        },
        fighter: {
            id: "fighter",
            name: "Fighter",
            hitDie: 10,
            primaryAbility: ["str", "dex"],
            savingThrows: ["str", "con"],
            armorProficiencies: ["All armor", "Shields"],
            weaponProficiencies: ["Simple weapons", "Martial weapons"],
            skillChoices: { count: 2, from: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"] },
            skills: ["Athletics", "Perception", "Intimidation"],
            features: [
                { name: "Fighting Style", desc: "Master of weapon combat: +2 to damage rolls and protective stances." },
                { name: "Second Wind", desc: "Regain 1d10 + 1 hit points as a bonus action once per encounter." }
            ],
            casterType: null,
            spellAbility: null
        },
        monk: {
            id: "monk",
            name: "Monk",
            hitDie: 8,
            primaryAbility: ["dex", "wis"],
            savingThrows: ["str", "dex"],
            armorProficiencies: ["None"],
            weaponProficiencies: ["Simple weapons", "Shortswords"],
            skillChoices: { count: 2, from: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"] },
            skills: ["Acrobatics", "Insight", "Athletics"],
            features: [
                { name: "Unarmored Defense", desc: "While not wearing armor, AC equals 10 + DEX mod + WIS mod." },
                { name: "Martial Arts", desc: "Deal 1d4 damage with unarmed strikes and make an extra unarmed strike." }
            ],
            casterType: null,
            spellAbility: null
        },
        paladin: {
            id: "paladin",
            name: "Paladin",
            hitDie: 10,
            primaryAbility: ["str", "cha"],
            savingThrows: ["wis", "cha"],
            armorProficiencies: ["All armor", "Shields"],
            weaponProficiencies: ["Simple weapons", "Martial weapons"],
            skillChoices: { count: 2, from: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"] },
            skills: ["Athletics", "Persuasion", "Insight"],
            features: [
                { name: "Divine Sense", desc: "Detect celestials, fiends, and undead within 60 feet." },
                { name: "Lay on Hands", desc: "Touch a creature to heal up to 5 hit points per day from a divine pool." }
            ],
            casterType: "divine",
            spellAbility: "cha",
            spellSlots: { 1: { max: 0, current: 0 } }, // Spellcasting unlocks at Lvl 2
            defaultCantrips: [],
            defaultSpells: ["Bless", "Cure Wounds", "Divine Favor", "Heroism"]
        },
        ranger: {
            id: "ranger",
            name: "Ranger",
            hitDie: 10,
            primaryAbility: ["dex", "wis"],
            savingThrows: ["str", "dex"],
            armorProficiencies: ["Light armor", "Medium armor", "Shields"],
            weaponProficiencies: ["Simple weapons", "Martial weapons"],
            skillChoices: { count: 3, from: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"] },
            skills: ["Stealth", "Perception", "Survival"],
            features: [
                { name: "Favored Enemy", desc: "Advantage on survival checks to track beasts and humanoids; bonus damage." },
                { name: "Natural Explorer", desc: "Difficult terrain does not slow travel; adept at foraging and navigation." }
            ],
            casterType: "divine",
            spellAbility: "wis",
            spellSlots: { 1: { max: 0, current: 0 } }, // Spellcasting unlocks at Lvl 2
            defaultCantrips: [],
            defaultSpells: ["Hunter's Mark", "Cure Wounds", "Fog Cloud"]
        },
        rogue: {
            id: "rogue",
            name: "Rogue",
            hitDie: 8,
            primaryAbility: ["dex"],
            savingThrows: ["dex", "int"],
            armorProficiencies: ["Light armor"],
            weaponProficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
            skillChoices: { count: 4, from: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"] },
            skills: ["Stealth", "Sleight of Hand", "Acrobatics", "Perception", "Deception"],
            features: [
                { name: "Sneak Attack", desc: "Deal an extra 1d6 damage to a creature you hit with advantage or an ally adjacent." },
                { name: "Thieves' Cant", desc: "Secret dialect of coded phrases, dialect, and hidden underworld signs." },
                { name: "Expertise", desc: "Double proficiency bonus on Stealth and Sleight of Hand checks." }
            ],
            casterType: null,
            spellAbility: null
        },
        sorcerer: {
            id: "sorcerer",
            name: "Sorcerer",
            hitDie: 6,
            primaryAbility: ["cha"],
            savingThrows: ["con", "cha"],
            armorProficiencies: ["None"],
            weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
            skillChoices: { count: 2, from: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"] },
            skills: ["Arcana", "Persuasion", "Intimidation"],
            features: [
                { name: "Spellcasting", desc: "Innate raw magical power surges through innate magical bloodline." },
                { name: "Sorcerous Origin", desc: "Draconic Bloodline: scales grant AC 13 + DEX mod, and +1 max HP per level." }
            ],
            casterType: "arcane",
            spellAbility: "cha",
            spellSlots: { 1: { max: 2, current: 2 } },
            defaultCantrips: ["Fire Bolt", "Acid Splash", "Shocking Grasp", "Light"],
            defaultSpells: ["Magic Missile", "Shield", "Burning Hands"]
        },
        warlock: {
            id: "warlock",
            name: "Warlock",
            hitDie: 8,
            primaryAbility: ["cha"],
            savingThrows: ["wis", "cha"],
            armorProficiencies: ["Light armor"],
            weaponProficiencies: ["Simple weapons"],
            skillChoices: { count: 2, from: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"] },
            skills: ["Arcana", "Deception", "History"],
            features: [
                { name: "Otherworldly Patron", desc: "Bound by an eldritch pact to a transcendent otherworldly entity." },
                { name: "Pact Magic", desc: "Cast potent arcane spells that recharge upon a short rest." }
            ],
            casterType: "arcane",
            spellAbility: "cha",
            spellSlots: { 1: { max: 1, current: 1 } },
            defaultCantrips: ["Eldritch Blast", "Minor Illusion"],
            defaultSpells: ["Armor of Agathys", "Hex", "Hellish Rebuke"]
        },
        wizard: {
            id: "wizard",
            name: "Wizard",
            hitDie: 6,
            primaryAbility: ["int"],
            savingThrows: ["int", "wis"],
            armorProficiencies: ["None"],
            weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
            skillChoices: { count: 2, from: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"] },
            skills: ["Arcana", "History", "Investigation", "Religion"],
            features: [
                { name: "Spellcasting", desc: "Master of arcane formulas, runes, and scholar of eldritch incantations." },
                { name: "Arcane Recovery", desc: "Regain expended spell slots once per day upon resting." }
            ],
            casterType: "arcane",
            spellAbility: "int",
            spellSlots: { 1: { max: 2, current: 2 } },
            defaultCantrips: ["Fire Bolt", "Ray of Frost", "Light", "Mage Hand"],
            defaultSpells: ["Magic Missile", "Shield", "Mage Armor", "Burning Hands", "Sleep", "Detect Magic"]
        }
    };

    // Rich Spell Catalog for BG1 Spells Page
    const DND_SPELLS = {
        // Arcane Cantrips
        "Fire Bolt": { name: "Fire Bolt", level: 0, school: "Evocation", range: "120 ft", time: "1 action", duration: "Instant", comp: "V, S", desc: "Hurl a mote of fire dealing 1d10 fire damage on a hit." },
        "Ray of Frost": { name: "Ray of Frost", level: 0, school: "Evocation", range: "60 ft", time: "1 action", duration: "Instant", comp: "V, S", desc: "Frigid blue beam dealing 1d8 cold damage and reducing target speed by 10 ft." },
        "Light": { name: "Light", level: 0, school: "Evocation", range: "Touch", time: "1 action", duration: "1 hour", comp: "V, M", desc: "Shed bright light in a 20-foot radius from an object." },
        "Mage Hand": { name: "Mage Hand", level: 0, school: "Conjuration", range: "30 ft", time: "1 action", duration: "1 min", comp: "V, S", desc: "Summon a spectral floating hand to manipulate distant objects or haul up to 10 lbs." },
        "Acid Splash": { name: "Acid Splash", level: 0, school: "Conjuration", range: "60 ft", time: "1 action", duration: "Instant", comp: "V, S", desc: "Hurl a bubble of acid dealing 1d6 acid damage to one or two adjacent creatures." },
        "Shocking Grasp": { name: "Shocking Grasp", level: 0, school: "Evocation", range: "Touch", time: "1 action", duration: "Instant", comp: "V, S", desc: "Lightning jolts dealing 1d8 lightning damage; target cannot take reactions." },
        "Eldritch Blast": { name: "Eldritch Blast", level: 0, school: "Evocation", range: "120 ft", time: "1 action", duration: "Instant", comp: "V, S", desc: "Beam of crackling eldritch energy dealing 1d10 force damage." },
        "Minor Illusion": { name: "Minor Illusion", level: 0, school: "Illusion", range: "30 ft", time: "1 action", duration: "1 min", comp: "S, M", desc: "Create a sound or static visual illusion of an object." },
        "Vicious Mockery": { name: "Vicious Mockery", level: 0, school: "Enchantment", range: "60 ft", time: "1 action", duration: "Instant", comp: "V", desc: "Unleash insults laced with subtle enchantments dealing 1d4 psychic damage and disadvantage." },
        "Dancing Lights": { name: "Dancing Lights", level: 0, school: "Evocation", range: "120 ft", time: "1 action", duration: "1 min", comp: "V, S, M", desc: "Create up to four glowing lantern-like lights that illuminate surroundings." },

        // Arcane Level 1 Spells
        "Magic Missile": { name: "Magic Missile", level: 1, school: "Evocation", range: "120 ft", time: "1 action", duration: "Instant", comp: "V, S", desc: "Launch three unerring glowing darts of magical force dealing 1d4 + 1 damage each." },
        "Shield": { name: "Shield", level: 1, school: "Abjuration", range: "Self", time: "1 reaction", duration: "1 round", comp: "V, S", desc: "An invisible barrier grants +5 to AC and negates Magic Missile damage." },
        "Mage Armor": { name: "Mage Armor", level: 1, school: "Abjuration", range: "Touch", time: "1 action", duration: "8 hours", comp: "V, S, M", desc: "Protective magical force surrounds an unarmored creature, making base AC 13 + DEX mod." },
        "Burning Hands": { name: "Burning Hands", level: 1, school: "Evocation", range: "Self (15 ft cone)", time: "1 action", duration: "Instant", comp: "V, S", desc: "A thin sheet of flame erupts dealing 3d6 fire damage (DEX save half)." },
        "Sleep": { name: "Sleep", level: 1, school: "Enchantment", range: "90 ft", time: "1 action", duration: "1 min", comp: "V, S, M", desc: "Send 5d8 hit points worth of creatures into a deep magical slumber." },
        "Detect Magic": { name: "Detect Magic", level: 1, school: "Divination", range: "Self (30 ft)", time: "1 action", duration: "10 min", comp: "V, S", desc: "Sense the presence and school of magic within 30 feet." },
        "Charm Person": { name: "Charm Person", level: 1, school: "Enchantment", range: "30 ft", time: "1 action", duration: "1 hour", comp: "V, S", desc: "Charm a humanoid to regard you as a friendly acquaintance (WIS save)." },
        "Armor of Agathys": { name: "Armor of Agathys", level: 1, school: "Abjuration", range: "Self", time: "1 action", duration: "1 hour", comp: "V, S, M", desc: "Spectral frost gives 5 temp HP and deals 5 cold damage to attackers." },
        "Hex": { name: "Hex", level: 1, school: "Enchantment", range: "90 ft", time: "1 bonus", duration: "1 hour", comp: "V, S, M", desc: "Curse a target to take +1d6 necrotic damage on hits and disadvantage on one ability." },
        "Hellish Rebuke": { name: "Hellish Rebuke", level: 1, school: "Evocation", range: "60 ft", time: "1 reaction", duration: "Instant", comp: "V, S", desc: "Surround an attacker in hellfire dealing 2d10 fire damage." },
        "Dissonant Whispers": { name: "Dissonant Whispers", level: 1, school: "Enchantment", range: "60 ft", time: "1 action", duration: "Instant", comp: "V", desc: "Whisper a discordant melody dealing 3d6 psychic damage and forcing flight." },

        // Divine / Priest Cantrips
        "Sacred Flame": { name: "Sacred Flame", level: 0, school: "Evocation", range: "60 ft", time: "1 action", duration: "Instant", comp: "V, S", desc: "Flame-like radiance descends dealing 1d8 radiant damage (DEX save ignores cover)." },
        "Guidance": { name: "Guidance", level: 0, school: "Divination", range: "Touch", time: "1 action", duration: "1 min", comp: "V, S", desc: "Bless a creature with a +1d4 bonus to an ability check of its choice." },
        "Thaumaturgy": { name: "Thaumaturgy", level: 0, school: "Transmutation", range: "30 ft", time: "1 action", duration: "1 min", comp: "V", desc: "Manifest minor miracles: booming voice, flickering flames, tremors, or slam doors." },
        "Druidcraft": { name: "Druidcraft", level: 0, school: "Transmutation", range: "30 ft", time: "1 action", duration: "Instant", comp: "V, S", desc: "Whisper with nature to predict weather, bloom flowers, or summon harmless sensory gusts." },
        "Produce Flame": { name: "Produce Flame", level: 0, school: "Conjuration", range: "Self / 30 ft", time: "1 action", duration: "10 min", comp: "V, S", desc: "A flickering flame appears in your hand shedding light; can be hurled for 1d8 fire damage." },
        "Shillelagh": { name: "Shillelagh", level: 0, school: "Transmutation", range: "Touch", time: "1 bonus", duration: "1 min", comp: "V, S, M", desc: "Imbue a club or staff with nature's power: uses WIS for attacks and deals 1d8 bludgeoning." },

        // Divine / Priest Level 1 Prayers
        "Bless": { name: "Bless", level: 1, school: "Enchantment", range: "30 ft", time: "1 action", duration: "1 min", comp: "V, S, M", desc: "Bless up to three creatures with a +1d4 bonus to attack rolls and saving throws." },
        "Cure Wounds": { name: "Cure Wounds", level: 1, school: "Evocation", range: "Touch", time: "1 action", duration: "Instant", comp: "V, S", desc: "A creature you touch regains 1d8 + spellcasting modifier hit points." },
        "Healing Word": { name: "Healing Word", level: 1, school: "Evocation", range: "60 ft", time: "1 bonus", duration: "Instant", comp: "V", desc: "Speak a divine word of healing restoring 1d4 + spellcasting modifier hit points." },
        "Guiding Bolt": { name: "Guiding Bolt", level: 1, school: "Evocation", range: "120 ft", time: "1 action", duration: "1 round", comp: "V, S", desc: "A flash of radiant light deals 4d6 radiant damage; next attack against target has advantage." },
        "Sanctuary": { name: "Sanctuary", level: 1, school: "Abjuration", range: "30 ft", time: "1 bonus", duration: "1 min", comp: "V, S, M", desc: "Ward a creature; any enemy targeting it must make a WIS save or lose the attack." },
        "Shield of Faith": { name: "Shield of Faith", level: 1, school: "Abjuration", range: "60 ft", time: "1 bonus", duration: "10 min", comp: "V, S, M", desc: "A shimmering field surrounds a creature, granting a +2 bonus to AC." },
        "Entangle": { name: "Entangle", level: 1, school: "Conjuration", range: "90 ft", time: "1 action", duration: "1 min", comp: "V, S", desc: "Grasping weeds and vines sprout in a 20-ft square, restraining creatures (STR save)." },
        "Goodberry": { name: "Goodberry", level: 1, school: "Transmutation", range: "Touch", time: "1 action", duration: "24 hours", comp: "V, S, M", desc: "Infuse up to 10 berries with magic: eating one restores 1 HP and provides nourishment for a day." },
        "Faerie Fire": { name: "Faerie Fire", level: 1, school: "Evocation", range: "60 ft", time: "1 action", duration: "1 min", comp: "V", desc: "Objects and creatures in a 20-ft cube glow blue, green, or violet; attacks have advantage." },
        "Hunter's Mark": { name: "Hunter's Mark", level: 1, school: "Divination", range: "90 ft", time: "1 bonus", duration: "1 hour", comp: "V", desc: "Mark a quarry to deal +1d6 damage on hits and gain advantage on Perception and Survival to track it." },
        "Divine Favor": { name: "Divine Favor", level: 1, school: "Evocation", range: "Self", time: "1 bonus", duration: "1 min", comp: "V, S", desc: "Prayer empowers weapon strikes with radiant energy dealing an extra 1d4 radiant damage." },
        "Heroism": { name: "Heroism", level: 1, school: "Enchantment", range: "Touch", time: "1 action", duration: "1 min", comp: "V, S", desc: "A willing creature is immune to fear and gains temporary HP equal to spell mod each turn." },
        "Fog Cloud": { name: "Fog Cloud", level: 1, school: "Conjuration", range: "120 ft", time: "1 action", duration: "1 hour", comp: "V, S", desc: "Create a 20-foot-radius sphere of dense fog that heavily obscures the area." }
    };

    // SRD 5.1 Racial Alignments (skewed toward race nature & cultural traditions)
    const RACIAL_ALIGNMENTS = {
        human: [
            { a: "Lawful Good", w: 10 }, { a: "Neutral Good", w: 15 }, { a: "Chaotic Good", w: 10 },
            { a: "Lawful Neutral", w: 15 }, { a: "True Neutral", w: 20 }, { a: "Chaotic Neutral", w: 10 },
            { a: "Lawful Evil", w: 5 }, { a: "Neutral Evil", w: 10 }, { a: "Chaotic Evil", w: 5 }
        ],
        dwarf: [
            { a: "Lawful Good", w: 60 }, { a: "Lawful Neutral", w: 25 }, { a: "Neutral Good", w: 15 }
        ],
        elf: [
            { a: "Chaotic Good", w: 65 }, { a: "Chaotic Neutral", w: 20 }, { a: "Neutral Good", w: 15 }
        ],
        halfling: [
            { a: "Lawful Good", w: 45 }, { a: "Neutral Good", w: 45 }, { a: "Chaotic Good", w: 10 }
        ],
        dragonborn: [
            { a: "Lawful Good", w: 45 }, { a: "Neutral Good", w: 25 }, { a: "Lawful Neutral", w: 20 }, { a: "Lawful Evil", w: 10 }
        ],
        gnome: [
            { a: "Neutral Good", w: 50 }, { a: "Chaotic Good", w: 30 }, { a: "Lawful Good", w: 20 }
        ],
        "half-elf": [
            { a: "Chaotic Good", w: 55 }, { a: "Chaotic Neutral", w: 25 }, { a: "Neutral Good", w: 20 }
        ],
        "half-orc": [
            { a: "Chaotic Neutral", w: 45 }, { a: "True Neutral", w: 20 }, { a: "Chaotic Evil", w: 25 }, { a: "Neutral Evil", w: 10 }
        ],
        tiefling: [
            { a: "Chaotic Neutral", w: 45 }, { a: "Chaotic Evil", w: 25 }, { a: "Neutral Evil", w: 20 }, { a: "True Neutral", w: 10 }
        ],
        goblin: [
            { a: "Neutral Evil", w: 70 }, { a: "Chaotic Evil", w: 20 }, { a: "Lawful Evil", w: 10 }
        ],
        orc: [
            { a: "Chaotic Evil", w: 75 }, { a: "Chaotic Neutral", w: 15 }, { a: "Neutral Evil", w: 10 }
        ],
        kobold: [
            { a: "Lawful Evil", w: 75 }, { a: "Lawful Neutral", w: 15 }, { a: "Neutral Evil", w: 10 }
        ]
    };

    function rollAlignment(species, rng) {
        const sp = String(species || "human").toLowerCase();
        const weights = RACIAL_ALIGNMENTS[sp] || RACIAL_ALIGNMENTS.human;
        let total = 0;
        for (const w of weights) total += w.w;
        let r = (typeof rng === "function" ? rng() : Math.random()) * total;
        for (const w of weights) {
            r -= w.w;
            if (r <= 0) return w.a;
        }
        return weights[0].a;
    }

    const Dnd5e = {
        classes: DND_CLASSES,
        spells: DND_SPELLS,
        RACIAL_ALIGNMENTS,

        classDef(classId) {
            return DND_CLASSES[classId] || null;
        },

        allClasses() {
            return Object.values(DND_CLASSES);
        },

        spellDef(spellName) {
            return DND_SPELLS[spellName] || null;
        },

        statMod,
        formatMod,

        /**
         * Roll the six D&D 5.1 SRD ability scores:
         * 4d6 drop the lowest, clamped 3-18.
         */
        rollAbilityScores(seed, unitId, species = "human", stage = "adult") {
            const rng = mulberry32(hash32(seed, unitId, SALT_DND_STATS));
            const roll4d6DropLowest = () => {
                const dice = [0, 0, 0, 0].map(() => 1 + Math.floor(rng() * 6)).sort((a, b) => a - b);
                return dice[1] + dice[2] + dice[3];
            };

            // Species modifiers from SRD 5.1 species reference
            const speciesMods = {
                human: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
                dwarf: { con: 2, str: 1 },
                elf: { dex: 2, int: 1 },
                halfling: { dex: 2, cha: 1 },
                dragonborn: { str: 2, cha: 1 },
                gnome: { int: 2, con: 1 },
                "half-elf": { cha: 2, dex: 1, con: 1 },
                "half-orc": { str: 2, con: 1 },
                tiefling: { cha: 2, int: 1 }
            };
            const sMod = speciesMods[species] || speciesMods.human;

            const stageMod = (stage === "baby" || stage === "child") ? { str: -2, con: -2 } : (stage === "elder" ? { str: -1, dex: -1, con: -1 } : {});

            const stats = {};
            for (const k of STAT_KEYS) {
                const raw = roll4d6DropLowest();
                const bonus = (sMod[k] | 0) + (stageMod[k] | 0);
                stats[k] = Math.max(3, Math.min(20, raw + bonus));
            }
            return stats;
        },

        // D&D 5.1 SRD Racial Alignments skewed towards each race
        alignmentOf(species, seed = 1, unitId = 0) {
            const rng = mulberry32(hash32(seed, unitId, 0xa119));
            return rollAlignment(species, rng);
        },

        /**
         * Evaluate class suitability based on rolled ability scores and SRD 5.1 primary abilities.
         * Assigns class, level, hit die, max HP, AC, saving throws, skills, feats, and spells.
         */
        assignClass(stats, seed, unitId, species = "human") {
            const rng = mulberry32(hash32(seed, unitId, SALT_DND_CLASS));
            const alignment = rollAlignment(species, rng);
            const scores = stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

            // Score each class based on average of primary ability scores
            const ranked = Object.values(DND_CLASSES).map(cls => {
                let total = 0;
                for (const ability of cls.primaryAbility) {
                    total += (scores[ability] || 10);
                }
                const avgScore = total / cls.primaryAbility.length;
                // Add a small deterministic pseudo-random jitter to break ties and diversify
                const jitter = (rng() - 0.5) * 3;
                return { cls, fit: avgScore + jitter };
            });

            ranked.sort((a, b) => b.fit - a.fit);

            // Select among top conforming classes
            const best = ranked[0].cls;

            const conMod = statMod(scores.con || 10);
            const dexMod = statMod(scores.dex || 10);
            const intMod = statMod(scores.int || 10);
            const wisMod = statMod(scores.wis || 10);
            const chaMod = statMod(scores.cha || 10);

            // Level 1 HP: Max Hit Die + CON mod (minimum 1)
            const hpMax = Math.max(1, best.hitDie + conMod);

            // Level 1 Base AC: 10 + DEX mod (modified by class abilities like Monk / Barbarian)
            let baseAC = 10 + dexMod;
            if (best.id === "barbarian") baseAC = 10 + dexMod + conMod;
            if (best.id === "monk") baseAC = 10 + dexMod + wisMod;

            // Spellcasting details
            let spellSlots = null;
            let spellsKnown = [];
            let spellSaveDC = null;
            let spellAttackBonus = null;

            if (best.casterType) {
                const spellMod = best.spellAbility === "int" ? intMod : (best.spellAbility === "wis" ? wisMod : chaMod);
                spellSaveDC = 8 + 2 + spellMod; // 8 + prof bonus (+2) + ability mod
                spellAttackBonus = 2 + spellMod; // prof bonus (+2) + ability mod

                spellSlots = JSON.parse(JSON.stringify(best.spellSlots || {}));
                spellsKnown = (best.defaultCantrips || []).concat(best.defaultSpells || []);
            }

            // Deterministic skill selection from class choices
            const pool = (best.skillChoices && Array.isArray(best.skillChoices.from)) ? best.skillChoices.from.slice() : (best.skills || []).slice();
            const pickCount = Math.min(pool.length, (best.skillChoices && best.skillChoices.count) ? best.skillChoices.count : pool.length);
            const chosenSkills = [];
            for (let i = 0; i < pickCount; i++) {
                const idx = Math.floor(rng() * pool.length);
                chosenSkills.push(pool.splice(idx, 1)[0]);
            }
            const proficiencies = chosenSkills.map(s => s.toLowerCase());

            return {
                id: best.id,
                name: best.name,
                alignment: alignment || "True Neutral",
                level: 1,
                exp: 0,
                nextExp: 300,
                hitDie: best.hitDie,
                hpMax: hpMax,
                hp: hpMax,
                ac: baseAC,
                proficiencyBonus: 2,
                primaryAbility: best.primaryAbility.slice(),
                savingThrows: best.savingThrows.slice(),
                armorProficiencies: best.armorProficiencies.slice(),
                weaponProficiencies: best.weaponProficiencies.slice(),
                skills: chosenSkills,
                proficiencies: proficiencies,
                features: JSON.parse(JSON.stringify(best.features)),
                casterType: best.casterType,
                spellAbility: best.spellAbility,
                spellSaveDC,
                spellAttackBonus,
                spellSlots,
                spellsKnown,
                cantrips: (best.defaultCantrips || []).slice(),
                level1Spells: (best.defaultSpells || []).slice()
            };
        },

        /**
         * D&D 5.1 SRD Carrying Capacity & Encumbrance (d20 Rulebook)
         * - Base Capacity: STR score * 15 lbs.
         * - Push, Drag, or Lift: STR score * 30 lbs.
         * - Encumbered (speed -10 ft): > STR score * 5 lbs.
         * - Heavily Encumbered (speed -20 ft, disadvantage): > STR score * 10 lbs.
         * - Size Multipliers: Tiny x0.5, Small/Medium x1.0, Large x2.0, Huge x4.0, Gargantuan x8.0.
         * - Universal Inventory Capacity: 32 slots.
         */
        carryingCapacity(unitOrStr, sizeCategory, currentWeight = 0) {
            let str = 10;
            let size = (typeof sizeCategory === "string" ? sizeCategory.toLowerCase() : "medium");

            if (typeof unitOrStr === "number") {
                str = Math.max(1, unitOrStr | 0);
            } else if (unitOrStr && typeof unitOrStr === "object") {
                const d = unitOrStr.data || unitOrStr;
                if (d.dnd && d.dnd.stats && typeof d.dnd.stats.str === "number") {
                    str = d.dnd.stats.str;
                } else if (d.stats && typeof d.stats.str === "number") {
                    str = d.stats.str;
                }
                if (d.size) {
                    size = String(d.size).toLowerCase();
                } else if (d.species) {
                    const sp = String(d.species).toLowerCase();
                    if (["chicken", "rabbit", "rat", "frog", "cat", "squirrel"].includes(sp)) size = "tiny";
                    else if (["goblin", "halfling", "gnome", "kobold"].includes(sp)) size = "small";
                    else if (["bear", "elk", "horse", "ox", "boar", "ogre", "troll", "dire_wolf"].includes(sp)) size = "large";
                    else if (["giant", "mammoth", "cyclops"].includes(sp)) size = "huge";
                    else if (["dragon", "kraken", "behemoth"].includes(sp)) size = "gargantuan";
                    else size = "medium";
                }
            }

            const MULTIPLIERS = {
                tiny: 0.5,
                small: 1.0,
                medium: 1.0,
                large: 2.0,
                huge: 4.0,
                gargantuan: 8.0
            };
            const mult = MULTIPLIERS[size] || 1.0;

            const maxWeight = Math.round(str * 15 * mult * 10) / 10;
            const pushDragLift = Math.round(str * 30 * mult * 10) / 10;
            const encumbered = Math.round(str * 5 * mult * 10) / 10;
            const heavilyEncumbered = Math.round(str * 10 * mult * 10) / 10;
            const maxSlots = 32;

            const w = typeof currentWeight === "number" ? currentWeight : 0;
            let status = "unencumbered";
            let speedPenalty = 0;
            if (w > maxWeight) {
                status = "over_capacity";
                speedPenalty = 1.5;
            } else if (w > heavilyEncumbered) {
                status = "heavily_encumbered";
                speedPenalty = 0.7;
            } else if (w > encumbered) {
                status = "encumbered";
                speedPenalty = 0.3;
            }

            return {
                str,
                size,
                multiplier: mult,
                maxWeight,
                pushDragLift,
                encumbered,
                heavilyEncumbered,
                maxSlots,
                currentWeight: w,
                status,
                speedPenalty
            };
        },

        statMod,

        /**
         * Resolves a D&D 5.1 SRD ability check.
         * Accounts for ability modifier, skill proficiency bonus (+2 at lvl 1),
         * advantage/disadvantage, and exhaustion level 1+ disadvantageOnChecks.
         */
        rollCheck(unit, ability, skill, opts = {}) {
            const scores = (unit && unit.data && (unit.data.stats || unit.data.abilities || unit.data.scores)) || {};
            const abKey = String(ability || "str").toLowerCase();
            const score = Number.isFinite(scores[abKey]) ? scores[abKey] : 10;
            const mod = statMod(score);

            const profs = (unit && unit.data && Array.isArray(unit.data.proficiencies)) ? unit.data.proficiencies : [];
            const isProf = skill ? profs.includes(String(skill).toLowerCase()) : false;
            const pb = (unit && unit.data && unit.data.dnd && Number.isFinite(unit.data.dnd.proficiencyBonus)) ? unit.data.dnd.proficiencyBonus : 2;
            const profBonus = isProf ? pb : 0;

            const Col = window.UF && UF.Colonists;
            const eff = (Col && typeof Col.exhaustionEffects === "function") ? Col.exhaustionEffects(unit) : null;
            const hasDis = !!opts.disadvantage || (eff && eff.disadvantageOnChecks === true);
            const hasAdv = !!opts.advantage;
            const dis = hasDis && !hasAdv;
            const adv = hasAdv && !hasDis;

            const rng = typeof opts.rng === "function" ? opts.rng : Math.random;
            const r1 = Math.floor(rng() * 20) + 1;
            const r2 = Math.floor(rng() * 20) + 1;
            const d20 = dis ? Math.min(r1, r2) : (adv ? Math.max(r1, r2) : r1);
            const total = d20 + mod + profBonus;

            return {
                roll: d20,
                rolls: [r1, r2],
                mod,
                profBonus,
                total,
                ability: abKey,
                skill,
                proficient: isProf,
                advantage: adv,
                disadvantage: dis,
                dc: opts.dc,
                success: opts.dc !== undefined ? total >= opts.dc : null
            };
        },

        /**
         * Resolves a D&D 5.1 SRD saving throw.
         * Accounts for ability modifier, saving throw proficiency bonus,
         * advantage/disadvantage, and exhaustion level 3+ disadvantageOnAttacksAndSaves.
         */
        rollSave(unit, ability, opts = {}) {
            const scores = (unit && unit.data && (unit.data.stats || unit.data.abilities || unit.data.scores)) || {};
            const abKey = String(ability || "str").toLowerCase();
            const score = Number.isFinite(scores[abKey]) ? scores[abKey] : 10;
            const mod = statMod(score);

            const saves = (unit && unit.data && unit.data.dnd && Array.isArray(unit.data.dnd.savingThrows)) ? unit.data.dnd.savingThrows : [];
            const isProf = saves.map(s => String(s).toLowerCase()).includes(abKey);
            const pb = (unit && unit.data && unit.data.dnd && Number.isFinite(unit.data.dnd.proficiencyBonus)) ? unit.data.dnd.proficiencyBonus : 2;
            const profBonus = isProf ? pb : 0;

            const Col = window.UF && UF.Colonists;
            const eff = (Col && typeof Col.exhaustionEffects === "function") ? Col.exhaustionEffects(unit) : null;
            const hasDis = !!opts.disadvantage || (eff && eff.disadvantageOnAttacksAndSaves === true);
            const hasAdv = !!opts.advantage;
            const dis = hasDis && !hasAdv;
            const adv = hasAdv && !hasDis;

            const rng = typeof opts.rng === "function" ? opts.rng : Math.random;
            const r1 = Math.floor(rng() * 20) + 1;
            const r2 = Math.floor(rng() * 20) + 1;
            const d20 = dis ? Math.min(r1, r2) : (adv ? Math.max(r1, r2) : r1);
            const total = d20 + mod + profBonus;

            return {
                roll: d20,
                rolls: [r1, r2],
                mod,
                profBonus,
                total,
                ability: abKey,
                proficient: isProf,
                advantage: adv,
                disadvantage: dis,
                dc: opts.dc,
                success: opts.dc !== undefined ? total >= opts.dc : null
            };
        },

        /**
         * Derived max HP respecting exhaustion level 4+ (hpMaxFactor: 0.5).
         */
        derivedMaxHp(unit) {
            let base = 10;
            if (unit && unit.data) {
                if (unit.data.dnd && Number.isFinite(unit.data.dnd.hpMax)) base = unit.data.dnd.hpMax;
                else if (Number.isFinite(unit.data.maxHp)) base = unit.data.maxHp;
            }
            const Col = window.UF && UF.Colonists;
            const eff = (Col && typeof Col.exhaustionEffects === "function") ? Col.exhaustionEffects(unit) : null;
            if (eff && eff.hpMaxFactor !== undefined) {
                return Math.max(1, Math.floor(base * eff.hpMaxFactor));
            }
            return base;
        }
    };

    root.UF.Dnd5e = Dnd5e;
    root.DEUS.Dnd5e = Dnd5e;
})();
