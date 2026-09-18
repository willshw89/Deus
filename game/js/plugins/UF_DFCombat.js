//=============================================================================
// RPG Maker MZ - Ultima Fortress: Dwarf Fortress Multi-Racial Anatomical Combat
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF DFCombat] Multi-Racial Dwarf Fortress anatomical wound simulation (body parts, tissues, severed limbs/wings/horns/tails/servos, arterial bleeding, plasma burns, arc shock, and authentic DF announcements).
 * @author Deepdelve Architect
 *
 * @help
 * ============================================================================
 * Ultima Fortress Multi-Racial Combat Plugin (Science-Fantasy Fusion)
 * ============================================================================
 * Replaces abstract HP numbers with Dwarf Fortress's legendary physical
 * combat simulation tailored to the distinct anatomy of each species,
 * incorporating both classic steel and high-tech energy/plasma wounds:
 * - Karadrim: Stout frames, heavy ribcages, dense skulls, braided beards.
 * - Valen: Versatile humanoid anatomy, arterial throats, vital organs.
 * - Sylvathi: Slender graceful limbs, keen eyes, light bone density.
 * - Morvath: Sinewy arms, vicious claws, sallow hide.
 * - Kitterkin: Diminutive statures, oversized ears, severable tails.
 * - Vorgari: Sweeping leathery wings, curved horns, stonehide, tails.
 * - Automata: Star-iron chassis, optic sensors, pneumatic servo-arms, aether cores.
 * - Crag-Gargants: Thick stone plates, massive skulls, immense hearts.
 */

(() => {
    "use strict";

    const pluginName = "UF_DFCombat";
    window.UF_DFCombat = {};

    const SPECIES_ANATOMY = {
        karadrim: [
            { name: "head", weight: 8, vital: true, canSever: true, tissue: "dense skull and brain" },
            { name: "throat", weight: 4, vital: true, canSever: false, tissue: "thick throat and jugular" },
            { name: "upper body", weight: 32, vital: true, canSever: false, tissue: "heavy ribcage, heart and lungs" },
            { name: "lower body", weight: 16, vital: false, canSever: false, tissue: "stout belly and guts" },
            { name: "left arm", weight: 10, vital: false, canSever: true, tissue: "brawny arm and dense bone" },
            { name: "right arm", weight: 10, vital: false, canSever: true, tissue: "brawny arm and dense bone" },
            { name: "left leg", weight: 10, vital: false, canSever: true, tissue: "stout leg and heavy bone" },
            { name: "right leg", weight: 10, vital: false, canSever: true, tissue: "stout leg and heavy bone" }
        ],
        valen: [
            { name: "head", weight: 8, vital: true, canSever: true, tissue: "skull and brain" },
            { name: "throat", weight: 5, vital: true, canSever: false, tissue: "throat and carotid artery" },
            { name: "upper body", weight: 30, vital: true, canSever: false, tissue: "ribcage, heart and lungs" },
            { name: "lower body", weight: 17, vital: false, canSever: false, tissue: "abdomen and intestines" },
            { name: "left arm", weight: 10, vital: false, canSever: true, tissue: "arm and bone" },
            { name: "right arm", weight: 10, vital: false, canSever: true, tissue: "arm and bone" },
            { name: "left leg", weight: 10, vital: false, canSever: true, tissue: "thigh and bone" },
            { name: "right leg", weight: 10, vital: false, canSever: true, tissue: "thigh and bone" }
        ],
        sylvathi: [
            { name: "head", weight: 8, vital: true, canSever: true, tissue: "delicate skull and brain" },
            { name: "throat", weight: 5, vital: true, canSever: false, tissue: "slender throat" },
            { name: "upper body", weight: 28, vital: true, canSever: false, tissue: "ribs, heart and lungs" },
            { name: "lower body", weight: 15, vital: false, canSever: false, tissue: "slender waist" },
            { name: "left arm", weight: 11, vital: false, canSever: true, tissue: "slender arm and bone" },
            { name: "right arm", weight: 11, vital: false, canSever: true, tissue: "slender arm and bone" },
            { name: "left leg", weight: 11, vital: false, canSever: true, tissue: "agile leg and bone" },
            { name: "right leg", weight: 11, vital: false, canSever: true, tissue: "agile leg and bone" }
        ],
        morvath: [
            { name: "head", weight: 8, vital: true, canSever: true, tissue: "scarred skull and brain" },
            { name: "throat", weight: 4, vital: true, canSever: false, tissue: "throat" },
            { name: "upper body", weight: 30, vital: true, canSever: false, tissue: "sinewy chest and heart" },
            { name: "lower body", weight: 16, vital: false, canSever: false, tissue: "guts" },
            { name: "left arm", weight: 11, vital: false, canSever: true, tissue: "sinewy arm and bone" },
            { name: "right arm", weight: 11, vital: false, canSever: true, tissue: "sinewy arm and bone" },
            { name: "left leg", weight: 10, vital: false, canSever: true, tissue: "leg and bone" },
            { name: "right leg", weight: 10, vital: false, canSever: true, tissue: "leg and bone" }
        ],
        kitterkin: [
            { name: "head", weight: 8, vital: true, canSever: true, tissue: "small skull and brain" },
            { name: "ears", weight: 4, vital: false, canSever: true, tissue: "large ear cartilage" },
            { name: "throat", weight: 4, vital: true, canSever: false, tissue: "throat" },
            { name: "upper body", weight: 26, vital: true, canSever: false, tissue: "diminutive ribcage and heart" },
            { name: "lower body", weight: 14, vital: false, canSever: false, tissue: "belly" },
            { name: "tail", weight: 10, vital: false, canSever: true, tissue: "twitching tail and cartilage" },
            { name: "left arm", weight: 9, vital: false, canSever: true, tissue: "quick arm and bone" },
            { name: "right arm", weight: 9, vital: false, canSever: true, tissue: "quick arm and bone" },
            { name: "left leg", weight: 9, vital: false, canSever: true, tissue: "nimble leg and bone" },
            { name: "right leg", weight: 9, vital: false, canSever: true, tissue: "nimble leg and bone" }
        ],
        vorgari: [
            { name: "head", weight: 7, vital: true, canSever: true, tissue: "dense basalt skull and brain" },
            { name: "horns", weight: 6, vital: false, canSever: true, tissue: "curved obsidian horn" },
            { name: "wings", weight: 12, vital: false, canSever: true, tissue: "leathery wing membrane and bone" },
            { name: "throat", weight: 4, vital: true, canSever: false, tissue: "thick throat" },
            { name: "upper body", weight: 28, vital: true, canSever: false, tissue: "reinforced ribcage and volcanic heart" },
            { name: "tail", weight: 7, vital: false, canSever: true, tissue: "spiked basalt tail" },
            { name: "left arm", weight: 9, vital: false, canSever: true, tissue: "dense muscle and basalt hide" },
            { name: "right arm", weight: 9, vital: false, canSever: true, tissue: "dense muscle and basalt hide" },
            { name: "legs", weight: 18, vital: false, canSever: true, tissue: "powerful hind leg and bone" }
        ],
        automaton: [
            { name: "optic sensor", weight: 8, vital: true, canSever: true, tissue: "reinforced quartz visor and optic array" },
            { name: "chassis", weight: 36, vital: true, canSever: false, tissue: "star-iron plating, hydraulic valves, and humming aether core" },
            { name: "left servo-arm", weight: 12, vital: false, canSever: true, tissue: "pneumatic piston and plasma torch conduit" },
            { name: "right servo-arm", weight: 12, vital: false, canSever: true, tissue: "hardened steel claw and pneumatic actuator" },
            { name: "tread assembly", weight: 20, vital: false, canSever: true, tissue: "segmented tracks and drive gears" }
        ],
        crag_gargant: [
            { name: "head", weight: 10, vital: true, canSever: true, tissue: "massive crag skull, matted moss and brain" },
            { name: "upper body", weight: 40, vital: true, canSever: false, tissue: "massive stone plates, dense muscle and enormous heart" },
            { name: "forelimbs", weight: 25, vital: false, canSever: true, tissue: "pillar limb and dense bone" },
            { name: "hindlimbs", weight: 25, vital: false, canSever: true, tissue: "pillar limb and dense bone" }
        ]
    };

    // Aliases for backward compatibility
    SPECIES_ANATOMY["dwarf"] = SPECIES_ANATOMY["karadrim"];
    SPECIES_ANATOMY["human"] = SPECIES_ANATOMY["valen"];
    SPECIES_ANATOMY["elf"] = SPECIES_ANATOMY["sylvathi"];
    SPECIES_ANATOMY["goblin"] = SPECIES_ANATOMY["morvath"];
    SPECIES_ANATOMY["kobold"] = SPECIES_ANATOMY["kitterkin"];
    SPECIES_ANATOMY["gargoyle"] = SPECIES_ANATOMY["vorgari"];
    SPECIES_ANATOMY["troll"] = SPECIES_ANATOMY["crag_gargant"];

    function detectTargetRace(target) {
        if (!target) return "valen";
        const name = (typeof target.name === "function" ? target.name() : (target._name || "")).toLowerCase();
        if (name.includes("karadrim") || name.includes("dwarf") || name.includes("kragan") || name.includes("miner") || name.includes("smith") || name.includes("thorgar")) return "karadrim";
        if (name.includes("sylvathi") || name.includes("elf") || name.includes("ranger") || name.includes("caerith")) return "sylvathi";
        if (name.includes("morvath") || name.includes("goblin") || name.includes("lasher") || name.includes("raider")) return "morvath";
        if (name.includes("kitterkin") || name.includes("kobold") || name.includes("tik") || name.includes("slinker")) return "kitterkin";
        if (name.includes("vorgari") || name.includes("gargoyle") || name.includes("winged") || name.includes("vor") || name.includes("borin")) return "vorgari";
        if (name.includes("automaton") || name.includes("drone") || name.includes("warden") || name.includes("unit") || name.includes("sentinel")) return "automaton";
        if (name.includes("troll") || name.includes("gargant") || name.includes("beast")) return "crag_gargant";
        return "valen";
    }

    function pickRandomBodyPart(race) {
        const parts = SPECIES_ANATOMY[race] || SPECIES_ANATOMY.karadrim;
        const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const part of parts) {
            roll -= part.weight;
            if (roll <= 0) return part;
        }
        return parts[2]; // upper body / chassis default
    }

    // Generate authentic Dwarf Fortress combat announcement with Science-Fantasy flavor
    UF_DFCombat.generateCombatLog = function(attacker, target, damage, isCritical) {
        const atkName = typeof attacker.name === "function" ? attacker.name() : "The combatant";
        const tgtName = typeof target.name === "function" ? target.name() : "the defender";
        const race = detectTargetRace(target);
        const part = pickRandomBodyPart(race);
        const isEdged = Math.random() > 0.35;
        const isSciFi = Math.random() > 0.65; // 35% chance of tech/plasma energy strike

        let verb = isEdged ? "slashes" : "strikes";
        if (isSciFi) {
            verb = isEdged ? "cleaves with a hum of Star-Iron" : "discharges an arc of plasma against";
        } else if (damage > 100 || isCritical) {
            verb = isEdged ? "hacks" : "smashes";
        }

        if (damage <= 0) {
            return `${atkName} strikes ${tgtName} in the ${part.name}, but the blow glances harmlessly off!`;
        }

        // Fatal blow
        if (target.hp <= 0) {
            if (race === "automaton") {
                if (part.name === "optic sensor") {
                    return `${atkName} ${verb} ${tgtName}'s optic sensor, shattering the quartz visor and causing a catastrophic feedback loop! ${tgtName} collapses into silent scrap!`;
                } else {
                    return `${atkName} ${verb} ${tgtName}'s chassis, piercing the aetheric core! The volatile power cell detonates in a flash of cyan light! ${tgtName} has been obliterated!`;
                }
            } else if (part.name === "wings") {
                return `${atkName} ${verb} ${tgtName} across the wings, cleanly severing a wing! ${tgtName} crashes violently to the earth and perishes!`;
            } else if (part.name === "horns") {
                return `${atkName} ${verb} ${tgtName} in the horns, cleaving through into the brain! ${tgtName} has been struck down!`;
            } else if (part.canSever && isEdged && damage > 45) {
                return `${atkName} ${verb} ${tgtName} in the ${part.name}, cleanly severing it! The severed limb sails off in an arc! ${tgtName} has been struck down!`;
            } else if (part.name === "head") {
                return `${atkName} ${verb} ${tgtName} in the head, shattering the skull and tearing the brain! ${tgtName} collapses lifeless!`;
            } else {
                return `${atkName} ${verb} ${tgtName} in the ${part.name}, piercing through vital organs! ${tgtName} perishes!`;
            }
        }

        // Non-fatal wounds
        let woundDesc = "";
        if (race === "automaton") {
            if (part.canSever && isEdged && damage > 50) {
                woundDesc = "shearing through the pneumatic piston and severing the servo-arm in a shower of sparks!";
            } else if (damage > 60) {
                woundDesc = "denting the heavy star-iron plating and venting pressurized hydraulic fluid!";
            } else {
                woundDesc = "scuffing the outer chassis plating!";
            }
        } else if (part.name === "wings") {
            woundDesc = isSciFi ? "superheating the leathery wing membrane and charring bone!" : "tearing through the leathery membrane and spraying crimson blood!";
        } else if (part.name === "horns") {
            woundDesc = "fracturing the horn keratin with a resonant crack!";
        } else if (part.name === "tail") {
            woundDesc = "slicing deeply into the tail cartilage, making it twitch erratically!";
        } else if (damage > 80 || isCritical) {
            if (isSciFi) {
                woundDesc = `searing through the ${part.tissue} in a plume of plasma smoke and causing agonizing thermal shock!`;
            } else if (isEdged) {
                woundDesc = `tearing through the ${part.tissue} and causing heavy arterial bleeding!`;
            } else {
                woundDesc = `fracturing the bone into a splintered ruin!`;
            }
        } else if (damage > 30) {
            if (isEdged) {
                woundDesc = `cutting through the skin and bruising the muscle!`;
            } else {
                woundDesc = `bruising the bone through the skin!`;
            }
        } else {
            woundDesc = `scratching the skin!`;
        }

        return `${atkName} ${verb} ${tgtName} in the ${part.name}, ${woundDesc}`;
    };

    // Hook into Battle Log Window
    const _Window_BattleLog_displayHpDamage = Window_BattleLog.prototype.displayHpDamage;
    Window_BattleLog.prototype.displayHpDamage = function(target) {
        if (target.result().hpAffected && target.result().hpDamage !== 0) {
            const subject = BattleManager._subject || target;
            const logMessage = UF_DFCombat.generateCombatLog(
                subject,
                target,
                target.result().hpDamage,
                target.result().critical
            );
            this.push("addText", logMessage);
        }
        _Window_BattleLog_displayHpDamage.call(this, target);
    };

})();
