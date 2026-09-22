//=============================================================================
// DEUS_Conditions.js - Unified SRD 5.1 Condition Registry & State Engine
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Conditions] Official SRD 5.1 condition registry (15 conditions), machine-readable rule flags, duration domains, and mechanical modifier evaluation.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_World
 *
 * @help
 * Implements the 15 standard SRD 5.1 conditions:
 * Blinded, Charmed, Deafened, Exhaustion (6 levels), Frightened, Grappled,
 * Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone,
 * Restrained, Stunned, Unconscious.
 *
 * Each condition provides machine-readable mechanical flags queried by
 * UF.Rules and UF.Combat for attacks, defense, saving throws, and speeds.
 *
 * API:
 *   UF.Conditions.has(unit, condId) -> Boolean
 *   UF.Conditions.get(unit, condId) -> Object | null
 *   UF.Conditions.apply(unit, condId, opts) -> Object
 *   UF.Conditions.remove(unit, condId) -> Boolean
 *   UF.Conditions.all(unit) -> Array<Object>
 *   UF.Conditions.queryModifiers(unit) -> Object
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};

    const emit = (name, ...args) => {
        if (root.UF && root.UF.Events && root.UF.Events.emit) root.UF.Events.emit(name, ...args);
    };

    const Conditions = {};
    root.UF.Conditions = Conditions;

    const DEFINITIONS = {
        blinded: {
            id: "blinded",
            name: "Blinded",
            attackDisadvantage: true,
            incomingAttackAdvantage: true,
            autoFailPerceptionSight: true
        },
        charmed: {
            id: "charmed",
            name: "Charmed",
            cannotAttackCharmer: true,
            charmerSocialAdvantage: true
        },
        deafened: {
            id: "deafened",
            name: "Deafened",
            autoFailPerceptionHearing: true
        },
        exhaustion: {
            id: "exhaustion",
            name: "Exhaustion",
            hasLevels: true,
            maxLevels: 6
        },
        frightened: {
            id: "frightened",
            name: "Frightened",
            disadvantageChecksAndAttacksWhileSourceVisible: true,
            cannotWillinglyMoveCloser: true
        },
        grappled: {
            id: "grappled",
            name: "Grappled",
            speedZero: true
        },
        incapacitated: {
            id: "incapacitated",
            name: "Incapacitated",
            cannotTakeActionsOrReactions: true
        },
        invisible: {
            id: "invisible",
            name: "Invisible",
            attackAdvantage: true,
            incomingAttackDisadvantage: true
        },
        paralyzed: {
            id: "paralyzed",
            name: "Paralyzed",
            incapacitated: true,
            cannotMoveOrSpeak: true,
            autoFailStrDexSaves: true,
            incomingAttackAdvantage: true,
            incomingAttackWithin5ftIsCrit: true
        },
        petrified: {
            id: "petrified",
            name: "Petrified",
            incapacitated: true,
            cannotMoveOrSpeak: true,
            incomingAttackAdvantage: true,
            autoFailStrDexSaves: true,
            resistanceAllDamage: true,
            immunePoisonDisease: true
        },
        poisoned: {
            id: "poisoned",
            name: "Poisoned",
            attackDisadvantage: true,
            abilityCheckDisadvantage: true
        },
        prone: {
            id: "prone",
            name: "Prone",
            attackDisadvantage: true,
            incomingAttackAdvantageWithin5ft: true,
            incomingAttackDisadvantageBeyond5ft: true,
            movementCrawlOnly: true
        },
        restrained: {
            id: "restrained",
            name: "Restrained",
            speedZero: true,
            attackDisadvantage: true,
            incomingAttackAdvantage: true,
            dexSaveDisadvantage: true
        },
        stunned: {
            id: "stunned",
            name: "Stunned",
            incapacitated: true,
            cannotMove: true,
            autoFailStrDexSaves: true,
            incomingAttackAdvantage: true
        },
        unconscious: {
            id: "unconscious",
            name: "Unconscious",
            incapacitated: true,
            cannotMoveOrSpeak: true,
            dropsHeldItems: true,
            fallsProne: true,
            autoFailStrDexSaves: true,
            incomingAttackAdvantage: true,
            incomingAttackWithin5ftIsCrit: true
        }
    };

    Conditions.DEFINITIONS = DEFINITIONS;

    function ensureStore(unit) {
        if (!unit || !unit.data) return [];
        if (!Array.isArray(unit.data.conditions)) {
            unit.data.conditions = [];
        }
        return unit.data.conditions;
    }

    Conditions.has = function(unit, condId) {
        const store = ensureStore(unit);
        return store.some(c => c.id === condId);
    };

    Conditions.get = function(unit, condId) {
        const store = ensureStore(unit);
        return store.find(c => c.id === condId) || null;
    };

    Conditions.all = function(unit) {
        return ensureStore(unit).slice();
    };

    Conditions.apply = function(unit, condId, opts = {}) {
        if (!unit || !unit.data) return null;
        const def = DEFINITIONS[condId];
        if (!def) return null;

        const store = ensureStore(unit);
        let existing = store.find(c => c.id === condId);

        if (condId === "exhaustion") {
            const levelToAdd = typeof opts.level === "number" ? opts.level : 1;
            if (!existing) {
                existing = {
                    id: "exhaustion",
                    name: "Exhaustion",
                    level: Math.min(6, levelToAdd),
                    source: opts.source || "environment",
                    durationDomain: opts.durationDomain || "historical"
                };
                store.push(existing);
            } else {
                existing.level = Math.min(6, existing.level + levelToAdd);
            }
            emit("condition:applied", unit, existing);
            return existing;
        }

        if (existing) {
            // Refresh duration
            if (opts.duration !== undefined) existing.duration = opts.duration;
            return existing;
        }

        const entry = {
            id: condId,
            name: def.name,
            source: opts.source || null,
            duration: opts.duration !== undefined ? opts.duration : Infinity,
            durationDomain: opts.durationDomain || "action",
            createdAt: Date.now()
        };

        store.push(entry);
        emit("condition:applied", unit, entry);
        return entry;
    };

    Conditions.remove = function(unit, condId) {
        if (!unit || !unit.data || !Array.isArray(unit.data.conditions)) return false;
        const idx = unit.data.conditions.findIndex(c => c.id === condId);
        if (idx >= 0) {
            const removed = unit.data.conditions.splice(idx, 1)[0];
            emit("condition:removed", unit, removed);
            return true;
        }
        return false;
    };

    Conditions.queryModifiers = function(unit) {
        const mods = {
            attackAdvantage: false,
            attackDisadvantage: false,
            incomingAttackAdvantage: false,
            incomingAttackDisadvantage: false,
            autoFailStrDexSaves: false,
            dexSaveDisadvantage: false,
            incapacitated: false,
            speedMultiplier: 1.0,
            speedZero: false,
            critIfHitWithin5ft: false
        };

        if (!unit || !unit.data) return mods;
        const store = ensureStore(unit);

        for (const c of store) {
            const def = DEFINITIONS[c.id];
            if (!def) continue;

            if (def.attackDisadvantage) mods.attackDisadvantage = true;
            if (def.attackAdvantage) mods.attackAdvantage = true;
            if (def.incomingAttackAdvantage) mods.incomingAttackAdvantage = true;
            if (def.incomingAttackDisadvantage) mods.incomingAttackDisadvantage = true;
            if (def.autoFailStrDexSaves) mods.autoFailStrDexSaves = true;
            if (def.dexSaveDisadvantage) mods.dexSaveDisadvantage = true;
            if (def.incapacitated) mods.incapacitated = true;
            if (def.speedZero) mods.speedZero = true;
            if (def.incomingAttackWithin5ftIsCrit) mods.critIfHitWithin5ft = true;

            // Exhaustion levels
            if (c.id === "exhaustion" && c.level) {
                if (c.level >= 1) mods.abilityCheckDisadvantage = true;
                if (c.level >= 2) mods.speedMultiplier = Math.min(mods.speedMultiplier, 0.5);
                if (c.level >= 3) {
                    mods.attackDisadvantage = true;
                    mods.saveDisadvantage = true;
                }
                if (c.level >= 5) mods.speedZero = true;
            }
        }

        return mods;
    };

})();
