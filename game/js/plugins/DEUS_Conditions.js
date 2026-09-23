//=============================================================================
// DEUS_Conditions.js - Unified SRD 5.1 Condition Registry & State Engine
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Conditions] Authoritative SRD 5.1 condition registry (15 conditions), multi-instance lifecycle engine, and mechanical modifier evaluation.
 * @author UF project / DEUS
 * @base DEUS_World
 * @orderAfter DEUS_World
 * @orderAfter DEUS_Colonists
 *
 * @help
 * Implements the 15 standard SRD 5.1 conditions:
 * Blinded, Charmed, Deafened, Exhaustion (6 levels), Frightened, Grappled,
 * Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone,
 * Restrained, Stunned, Unconscious.
 *
 * Architecture & Invariants:
 * - Authoritative Condition State: All systems (Combat, Dnd5e, World, AI) query
 *   UF.Conditions rather than implementing condition checks independently.
 * - Multi-Instance Storage: Multiple independent sources may impose the same
 *   condition (e.g. spider bite and poison cloud). The condition remains active
 *   as long as >= 1 instance exists. Removing one instance leaves others intact.
 * - Non-Stacking Rule: Multiple instances of the SAME condition do NOT amplify
 *   penalties or stack numerical effects.
 * - No Authority Duplication:
 *   - DEUS_Colonists remains authoritative for exhaustion level.
 *   - DEUS_Colonists remains authoritative for 0-HP unconscious/dying state.
 *   - UF.Conditions reflects and queries these states without duplicate counters.
 * - Condition Relationships:
 *   - Paralyzed, Petrified, Stunned, Unconscious inherit Incapacitated effects.
 *   - Unconscious inherits Prone effects.
 *
 * API:
 *   UF.Conditions.has(unit, condId) -> Boolean
 *   UF.Conditions.get(unit, condId) -> Object | null
 *   UF.Conditions.instances(unit, condId) -> Array<Object>
 *   UF.Conditions.add(unit, condId, options) -> Object
 *   UF.Conditions.remove(unit, condId, sourceOrInstanceId) -> Boolean
 *   UF.Conditions.clear(unit, condId) -> Boolean
 *   UF.Conditions.standUp(unit) -> Boolean
 *   UF.Conditions.effects(unit, context) -> Object
 *   UF.Conditions.attackRollModifiers(attacker, target, opts) -> { advantage, disadvantage }
 *   UF.Conditions.checkModifiers(unit, ability, skill, opts) -> { autoFail, advantage, disadvantage }
 *   UF.Conditions.saveModifiers(unit, ability, opts) -> { autoFail, advantage, disadvantage }
 *   UF.Conditions.critOnHit(attacker, target, dist) -> Boolean
 *   UF.Conditions.damageMultiplier(unit, damageType) -> Number
 *   UF.Conditions.canAct(unit) -> Boolean
 *   UF.Conditions.canReact(unit) -> Boolean
 *   UF.Conditions.canMove(unit) -> Boolean
 *   UF.Conditions.canSpeak(unit) -> Boolean
 *   UF.Conditions.canHear(unit) -> Boolean
 *   UF.Conditions.canSee(unit) -> Boolean
 *   UF.Conditions.speedZero(unit) -> Boolean
 *   UF.Conditions.speedFactor(unit) -> Number
 *   UF.Conditions.canHarmfullyTarget(attacker, target) -> Boolean
 *   UF.Conditions.canWillinglyMoveTo(unit, targetX, targetY) -> Boolean
 *   UF.Conditions.tick(unit, currentTick) -> Void
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};
    root.DEUS = root.UF;

    const emit = (name, ...args) => {
        if (root.UF && root.UF.Events && root.UF.Events.emit) {
            root.UF.Events.emit(name, ...args);
        }
    };

    let nextInstanceId = 1;
    const now = () => (root.UF && root.UF.Time && typeof root.UF.Time.ticks === "function" ? root.UF.Time.ticks() : (root.UF && root.UF.World && root.UF.World._frame ? root.UF.World._frame : 0));

    //-------------------------------------------------------------------------
    // 15 SRD 5.1 Condition Definitions
    //-------------------------------------------------------------------------

    const DEFINITIONS = {
        blinded: {
            id: "blinded",
            name: "Blinded",
            cannotSee: true,
            autoFailSightChecks: true,
            attackDisadvantage: true,
            targetAttackAdvantage: true
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
            cannotHear: true,
            autoFailHearingChecks: true
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
            speedZero: true,
            endsIfGrapplerIncapacitatedOrMoved: true
        },
        incapacitated: {
            id: "incapacitated",
            name: "Incapacitated",
            canAct: false,
            canReact: false
        },
        invisible: {
            id: "invisible",
            name: "Invisible",
            attackAdvantage: true,
            targetAttackDisadvantage: true,
            heavilyObscured: true
        },
        paralyzed: {
            id: "paralyzed",
            name: "Paralyzed",
            inherits: ["incapacitated"],
            canMove: false,
            speedZero: true,
            canSpeak: false,
            autoFailStrSaves: true,
            autoFailDexSaves: true,
            targetAttackAdvantage: true,
            critIfHitWithin5ft: true
        },
        petrified: {
            id: "petrified",
            name: "Petrified",
            inherits: ["incapacitated"],
            canMove: false,
            speedZero: true,
            canSpeak: false,
            unaware: true,
            weightMultiplier: 10,
            agingCeased: true,
            targetAttackAdvantage: true,
            autoFailStrSaves: true,
            autoFailDexSaves: true,
            damageResistanceAll: true,
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
            movementCrawlOnly: true,
            attackDisadvantage: true,
            targetAttackAdvantageWithin5ft: true,
            targetAttackDisadvantageBeyond5ft: true
        },
        restrained: {
            id: "restrained",
            name: "Restrained",
            speedZero: true,
            targetAttackAdvantage: true,
            attackDisadvantage: true,
            dexSaveDisadvantage: true
        },
        stunned: {
            id: "stunned",
            name: "Stunned",
            inherits: ["incapacitated"],
            canMove: false,
            speedZero: true,
            falteringSpeech: true,
            autoFailStrSaves: true,
            autoFailDexSaves: true,
            targetAttackAdvantage: true
        },
        unconscious: {
            id: "unconscious",
            name: "Unconscious",
            inherits: ["incapacitated", "prone"],
            canMove: false,
            speedZero: true,
            canSpeak: false,
            unaware: true,
            dropsHeldItems: true,
            autoFailStrSaves: true,
            autoFailDexSaves: true,
            targetAttackAdvantage: true,
            critIfHitWithin5ft: true
        }
    };

    //-------------------------------------------------------------------------
    // Storage & Helpers
    //-------------------------------------------------------------------------

    function ensureStore(unit) {
        if (!unit || !unit.data) return {};
        if (!unit.data.conditions || typeof unit.data.conditions !== "object" || Array.isArray(unit.data.conditions)) {
            unit.data.conditions = {};
        }
        return unit.data.conditions;
    }

    function isDead(unit) {
        if (!unit || !unit.data) return true;
        return unit.data.dead === true || unit.data._isDying === true;
    }

    function exhaustionOf(unit) {
        if (!unit || !unit.data) return 0;
        const Col = root.UF && root.UF.Colonists;
        if (Col && typeof Col.exhaustion === "function") {
            try { return Col.exhaustion(unit) | 0; } catch (_) {}
        }
        if (unit.data.needs && typeof unit.data.needs.exhaustion === "number") {
            return unit.data.needs.exhaustion | 0;
        }
        return 0;
    }

    function isUnconsciousZeroHp(unit) {
        if (!unit || !unit.data) return false;
        if (isDead(unit)) return false;
        return typeof unit.data.hp === "number" && unit.data.hp <= 0;
    }

    // What a creature holds: the hand slots of the 12-slot model (mainHand, offHand) and the aliases older records
    // and DEUS_Sheet map onto them. Worn slots (body, head, feet, …) are never dropped.
    const HELD_SLOTS = ["mainHand", "offHand", "mainhand", "offhand", "weapon", "shield", "tool"];
    // Conditions that make a creature drop what it holds (SRD p. 359: an unconscious creature "drops whatever it is
    // holding"; a petrified creature and its gear turn to stone, nothing stays in a working grip). Incapacitated,
    // stunned and paralyzed creatures can take no action, but their grip holds (DEUS-TSK-FABLE-10).
    const DROPS_HELD = ["unconscious", "petrified"];
    // Conditions that end every grapple the creature holds the moment they are inflicted (SRD p. 358: a grapple
    // ends if the grappler is incapacitated).
    const INCAPACITATING = ["incapacitated", "stunned", "paralyzed", "unconscious", "petrified"];
    /**
     * Drops what the creature holds onto its own cell. An equipped item id (DEUS_Items' model: the id of an item the
     * unit carries) is put down on the cell and the slot cleared; a type string or { type, count } (older records)
     * is dropped as a new stack. Returns [{ slot, itemId, type }] and emits condition:dropped_items.
     */
    function dropHeldItems(unit) {
        const dropped = [];
        if (!unit || !unit.data) return dropped;
        const eq = unit.data.equipment;
        if (!eq || typeof eq !== "object") return dropped;
        const Items = root.UF && root.UF.Items;
        const base = unit.area || (root.UF && root.UF.World && root.UF.World.currentArea ? root.UF.World.currentArea() : { x: 0, y: 0 });
        const area = { x: base.x | 0, y: base.y | 0, z: unit.z !== undefined ? unit.z : (base.z !== undefined ? base.z : 0) };
        const x = unit.x | 0, y = unit.y | 0;
        for (const slot of HELD_SLOTS) {
            const it = eq[slot];
            if (it === null || it === undefined || it === "") continue;
            if (typeof it === "number") {
                const rec = Items && typeof Items.get === "function" ? Items.get(it) : null;
                if (rec && Items && typeof Items.putDown === "function") {
                    try { Items.putDown(rec.id, area, x, y); } catch (_) {}
                }
                dropped.push({ slot, itemId: it, type: rec ? rec.type : null });
            } else {
                const itemType = typeof it === "string" ? it : (it.type || it.id);
                const count = it && typeof it.count === "number" ? it.count : 1;
                if (itemType && Items && typeof Items.drop === "function") {
                    try { Items.drop(area, x, y, itemType, count); } catch (_) {}
                }
                dropped.push({ slot, itemId: null, type: itemType || null });
            }
            eq[slot] = null;
        }
        if (dropped.length) emit("condition:dropped_items", unit, dropped);
        return dropped;
    }

    // Grapples a creature holds are indexed on the grappler (unit.data.grappling: victim ids, JSON-safe), so that a
    // condition, death, removal or move of the grappler ends them at once, without a scan of the world.
    function grappleIndex(grappler) {
        if (!grappler || !grappler.data) return null;
        if (!Array.isArray(grappler.data.grappling)) grappler.data.grappling = [];
        return grappler.data.grappling;
    }
    function noteGrapple(grapplerId, victimId, on) {
        const grappler = findUnit(grapplerId);
        const list = grappleIndex(grappler);
        if (!list) return;
        const i = list.indexOf(victimId);
        if (on && i < 0) list.push(victimId);
        if (!on && i >= 0) list.splice(i, 1);
        if (!list.length) delete grappler.data.grappling;
    }
    // Ends the grappled instances on `victim` that `grapplerId` holds (all of them when grapplerId is null).
    function endGrapples(victim, grapplerId, reason) {
        if (!victim || !victim.data || !victim.data.conditions) return 0;
        const entry = victim.data.conditions.grappled;
        if (!entry || !Array.isArray(entry.instances)) return 0;
        let ended = 0;
        for (let i = entry.instances.length - 1; i >= 0; i--) {
            const inst = entry.instances[i];
            if (grapplerId !== null && grapplerId !== undefined && inst.sourceUnitId !== grapplerId) continue;
            entry.instances.splice(i, 1);
            inst.endedBecause = reason || null;
            noteGrapple(inst.sourceUnitId, victim.id, false);
            emit("condition:expired", victim, inst);
            emit("condition:removed", victim, inst);
            ended++;
        }
        if (!entry.instances.length) delete victim.data.conditions.grappled;
        return ended;
    }
    // Every grapple this creature holds ends: it was incapacitated, died, left the world or moved away.
    function releaseGrapplesHeldBy(grappler, reason) {
        if (!grappler || !grappler.data || !Array.isArray(grappler.data.grappling)) return 0;
        let ended = 0;
        for (const victimId of grappler.data.grappling.slice()) {
            const victim = findUnit(victimId);
            if (victim) ended += endGrapples(victim, grappler.id, reason);
        }
        delete grappler.data.grappling;
        return ended;
    }

    function chebyshevDist(a, b) {
        if (!a || !b) return Infinity;
        const ax = a.x !== undefined ? a.x : 0;
        const ay = a.y !== undefined ? a.y : 0;
        const bx = b.x !== undefined ? b.x : 0;
        const by = b.y !== undefined ? b.y : 0;
        return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    }

    function findUnit(unitId) {
        if (unitId === null || unitId === undefined) return null;
        const W = root.UF && root.UF.World;
        if (W && typeof W.unit === "function") return W.unit(unitId);
        if (W && W.state && W.state.units) return W.state.units[unitId] || null;
        return null;
    }

    //-------------------------------------------------------------------------
    // Conditions Engine API
    //-------------------------------------------------------------------------

    const Conditions = {
        DEFINITIONS,

        /**
         * Checks if a creature currently has an active condition.
         * Resolves dynamic authorities (exhaustion, 0-HP unconscious) and derived conditions
         * (e.g. paralyzed -> incapacitated, unconscious -> prone).
         */
        /** The slots whose contents an unconscious or petrified creature drops, and the conditions that drop them. */
        HELD_SLOTS: HELD_SLOTS.slice(),
        DROPS_HELD: DROPS_HELD.slice(),
        INCAPACITATING: INCAPACITATING.slice(),

        has(unit, conditionId) {
            if (!unit || !unit.data) return false;
            const cid = String(conditionId || "").toLowerCase();
            if (!DEFINITIONS[cid]) return false;

            // Exhaustion authority integration
            if (cid === "exhaustion") {
                return exhaustionOf(unit) > 0;
            }

            // Unconscious 0-HP dying integration
            if (cid === "unconscious") {
                if (isUnconsciousZeroHp(unit)) return true;
            }

            // Direct instance check
            const store = ensureStore(unit);
            if (store[cid] && Array.isArray(store[cid].instances) && store[cid].instances.length > 0) {
                return true;
            }

            // Derived conditions (SRD shared relationships)
            if (cid === "incapacitated") {
                return this.has(unit, "paralyzed") ||
                       this.has(unit, "petrified") ||
                       this.has(unit, "stunned") ||
                       this.has(unit, "unconscious");
            }

            if (cid === "prone") {
                return this.has(unit, "unconscious");
            }

            return false;
        },

        /**
         * Gets the condition container for a unit or null.
         */
        get(unit, conditionId) {
            if (!unit || !unit.data) return null;
            const cid = String(conditionId || "").toLowerCase();
            const store = ensureStore(unit);
            return store[cid] || null;
        },

        /**
         * Returns all active instances for a given condition on a unit.
         */
        instances(unit, conditionId) {
            if (!unit || !unit.data) return [];
            const cid = String(conditionId || "").toLowerCase();
            const store = ensureStore(unit);
            const list = (store[cid] && Array.isArray(store[cid].instances)) ? store[cid].instances.slice() : [];

            // Reflect exhaustion authority
            if (cid === "exhaustion" && list.length === 0) {
                const lvl = exhaustionOf(unit);
                if (lvl > 0) {
                    list.push({
                        id: "exhaustion_colonists",
                        condition: "exhaustion",
                        level: lvl,
                        source: "needs",
                        sourceUnitId: null,
                        startedAt: 0,
                        duration: null,
                        expiresAt: null,
                        domain: "action"
                    });
                }
            }

            // Reflect unconscious 0-HP authority
            if (cid === "unconscious" && list.length === 0 && isUnconsciousZeroHp(unit)) {
                list.push({
                    id: "unconscious_zero_hp",
                    condition: "unconscious",
                    source: "zero_hp",
                    sourceUnitId: null,
                    startedAt: now(),
                    duration: null,
                    expiresAt: null,
                    domain: "action",
                    dying: !!unit.data.dying,
                    stable: this.isStable(unit)
                });
            }

            return list;
        },

        /**
         * Returns all conditions currently active on a unit as a dictionary { [condId]: instances }.
         */
        all(unit) {
            if (!unit || !unit.data) return {};
            const result = {};
            for (const key of Object.keys(DEFINITIONS)) {
                if (this.has(unit, key)) {
                    result[key] = this.instances(unit, key);
                }
            }
            return result;
        },

        /**
         * Adds a condition instance to a creature.
         * Options:
         *   source: String (e.g. "spider_bite", "ghoul_touch", "frightful_presence")
         *   sourceUnit: Object or sourceUnitId: Number
         *   duration: Number in ticks/rounds (Infinity for indefinite)
         *   domain: "action" | "historical" (default "action")
         *   saveDc: Number (optional)
         *   saveAbility: String (e.g. "con", "wis")
         */
        add(unit, conditionId, options = {}) {
            if (!unit || !unit.data) return null;
            const cid = String(conditionId || "").toLowerCase();
            const def = DEFINITIONS[cid];
            if (!def) return null;

            // Exhaustion authority integration
            if (cid === "exhaustion") {
                const levelToAdd = typeof options.level === "number" ? Math.max(1, options.level | 0) : 1;
                const Col = root.UF && root.UF.Colonists;
                if (Col && typeof Col.addExhaustion === "function") {
                    try {
                        Col.addExhaustion(unit, levelToAdd, options.source || "effect");
                    } catch (_) {}
                } else if (unit.data.needs) {
                    unit.data.needs.exhaustion = Math.min(6, (unit.data.needs.exhaustion || 0) + levelToAdd);
                }
                const currentLvl = exhaustionOf(unit);
                const rec = { id: "exhaustion", condition: "exhaustion", level: currentLvl, source: options.source || "effect" };
                emit("condition:applied", unit, rec);
                emit("condition:added", unit, rec);
                return rec;
            }

            const store = ensureStore(unit);
            if (!store[cid] || !Array.isArray(store[cid].instances)) {
                store[cid] = { id: cid, name: def.name, instances: [] };
            }

            const currentTick = now();
            // Indefinite is stored as null (JSON keeps it; Infinity would not survive a save).
            const duration = Number.isFinite(options.duration) ? Math.max(1, options.duration) : null;
            const expiresAt = duration !== null ? currentTick + duration : null;
            // Instance ids stay unique across saves: a per-unit sequence rides in the record.
            unit.data.conditionSeq = (unit.data.conditionSeq | 0) + 1;
            const srcUnitId = options.sourceUnitId !== undefined ? options.sourceUnitId : (options.sourceUnit ? options.sourceUnit.id : null);

            const instance = {
                id: options.id || (`cond_${cid}_${unit.data.conditionSeq}`),
                condition: cid,
                source: options.source || "unknown",
                sourceUnitId: srcUnitId !== undefined ? srcUnitId : null,
                startedAt: options.startedAt !== undefined ? options.startedAt : currentTick,
                duration: duration,
                expiresAt: expiresAt,
                domain: options.domain || "action",
                saveDc: options.saveDc !== undefined ? options.saveDc : null,
                saveAbility: options.saveAbility || null,
                metadata: options.metadata || null
            };

            store[cid].instances.push(instance);

            if (cid === "grappled" && instance.sourceUnitId !== null && instance.sourceUnitId !== undefined) noteGrapple(instance.sourceUnitId, unit.id, true);
            // Unconscious and petrified creatures drop what they hold; unconscious falls prone (SRD p. 359).
            if (DROPS_HELD.includes(cid) && options.dropHeld !== false) dropHeldItems(unit);
            if (cid === "unconscious") this.add(unit, "prone", { source: "unconscious_fall", duration: instance.duration });
            // A grappler that can no longer act lets go at once (SRD p. 358).
            if (INCAPACITATING.includes(cid)) releaseGrapplesHeldBy(unit, `grappler ${cid}`);

            emit("condition:applied", unit, instance);
            emit("condition:added", unit, instance);
            return instance;
        },

        /**
         * Removes a specific condition instance by instance ID or source string.
         * If sourceOrInstanceId is omitted, removes the oldest instance.
         */
        remove(unit, conditionId, sourceOrInstanceId = null) {
            if (!unit || !unit.data) return false;
            const cid = String(conditionId || "").toLowerCase();
            const store = ensureStore(unit);

            // Exhaustion authority integration
            if (cid === "exhaustion") {
                const Col = root.UF && root.UF.Colonists;
                const levelsToRemove = typeof sourceOrInstanceId === "number" ? sourceOrInstanceId : 1;
                if (Col && typeof Col.removeExhaustion === "function") {
                    try { Col.removeExhaustion(unit, levelsToRemove); } catch (_) {}
                } else if (unit.data.needs && unit.data.needs.exhaustion > 0) {
                    unit.data.needs.exhaustion = Math.max(0, unit.data.needs.exhaustion - levelsToRemove);
                }
                emit("condition:removed", unit, { id: "exhaustion", condition: "exhaustion" });
                return true;
            }

            if (!store[cid] || !Array.isArray(store[cid].instances) || store[cid].instances.length === 0) {
                return false;
            }

            const arr = store[cid].instances;
            let idx = -1;
            if (sourceOrInstanceId === null || sourceOrInstanceId === undefined) {
                idx = 0;
            } else {
                idx = arr.findIndex(inst => inst.id === sourceOrInstanceId || inst.source === sourceOrInstanceId);
            }

            if (idx >= 0) {
                const removed = arr.splice(idx, 1)[0];
                if (arr.length === 0) {
                    delete store[cid];
                }
                if (cid === "grappled") noteGrapple(removed.sourceUnitId, unit.id, false);
                emit("condition:removed", unit, removed);
                return true;
            }

            return false;
        },

        /**
         * Clears all instances of a condition (or all conditions if conditionId is null).
         */
        clear(unit, conditionId = null) {
            if (!unit || !unit.data) return false;
            const store = ensureStore(unit);

            if (conditionId) {
                const cid = String(conditionId).toLowerCase();
                if (cid === "exhaustion") {
                    const Col = root.UF && root.UF.Colonists;
                    if (Col && typeof Col.removeExhaustion === "function") {
                        try { Col.removeExhaustion(unit, 6); } catch (_) {}
                    } else if (unit.data.needs) {
                        unit.data.needs.exhaustion = 0;
                    }
                    emit("condition:cleared", unit, cid);
                    return true;
                }
                if (store[cid]) {
                    if (cid === "grappled") for (const inst of store[cid].instances || []) noteGrapple(inst.sourceUnitId, unit.id, false);
                    delete store[cid];
                    emit("condition:cleared", unit, cid);
                    return true;
                }
                return false;
            }

            // Clear all
            for (const k of Object.keys(store)) {
                if (k === "grappled") for (const inst of store[k].instances || []) noteGrapple(inst.sourceUnitId, unit.id, false);
                delete store[k];
            }
            if (unit.data.needs && unit.data.needs.exhaustion) {
                unit.data.needs.exhaustion = 0;
            }
            emit("condition:cleared", unit, null);
            return true;
        },

        /**
         * Stand up action: ends prone state if creature can act.
         */
        standUp(unit) {
            if (!unit || !unit.data) return false;
            if (!this.has(unit, "prone")) return false;
            if (!this.canAct(unit)) return false; // Paralyzed, unconscious, etc. cannot stand up

            const removed = this.clear(unit, "prone");
            emit("condition:stood_up", unit);
            return removed;
        },

        //---------------------------------------------------------------------
        // Capability & Action Queries
        //---------------------------------------------------------------------

        /**
         * A creature at 0 hit points that is stable (DEUS_Colonists' dying record, or a `stable` flag on the unit)
         * makes no death saving throws and stays unconscious until it is healed or wakes (DEUS-TSK-FABLE-10).
         */
        isStable(unit) {
            if (!unit || !unit.data || !isUnconsciousZeroHp(unit)) return false;
            if (unit.data.dying && unit.data.dying.stable === true) return true;
            return unit.data.stable === true;
        },

        /** Drops what the creature holds onto its cell (see dropHeldItems). */
        dropHeldItems(unit) {
            return dropHeldItems(unit);
        },

        /** Ends every grapple the creature holds (it is incapacitated, dead, gone or moved away). Returns how many. */
        releaseGrapples(grappler, reason = "released") {
            return releaseGrapplesHeldBy(grappler, reason);
        },

        /**
         * Call after a unit moved (DEUS_World can call it from its step; tick() catches it too): the grapples it holds on
         * creatures now farther than one cell end, and its own grappled instances whose grappler is farther than one cell
         * end. Returns how many ended.
         */
        onUnitMoved(unit) {
            if (!unit || !unit.data) return 0;
            let ended = 0;
            if (Array.isArray(unit.data.grappling)) {
                for (const victimId of unit.data.grappling.slice()) {
                    const victim = findUnit(victimId);
                    if (!victim || chebyshevDist(unit, victim) > 1) ended += victim ? endGrapples(victim, unit.id, "grappler moved away") : 0;
                    if (!victim) noteGrapple(unit.id, victimId, false);
                }
            }
            const entry = unit.data.conditions && unit.data.conditions.grappled;
            if (entry && Array.isArray(entry.instances)) {
                for (const inst of entry.instances.slice()) {
                    if (inst.sourceUnitId === null || inst.sourceUnitId === undefined) continue;
                    const grappler = findUnit(inst.sourceUnitId);
                    if (!grappler || chebyshevDist(unit, grappler) > 1) ended += endGrapples(unit, inst.sourceUnitId, "moved out of reach");
                }
            }
            return ended;
        },

        /**
         * Line of sight between two units: the same level and no wall, door or solid rock on the cells between them
         * (Bresenham). DEUS_World or DEUS_Levels may install a better test with setLineOfSight(fn).
         */
        lineOfSight(a, b) {
            if (!a || !b) return false;
            if (a.area && b.area && (a.area.x !== b.area.x || a.area.y !== b.area.y)) return false;
            const za = a.z !== undefined ? a.z : (a.area && a.area.z !== undefined ? a.area.z : 0);
            const zb = b.z !== undefined ? b.z : (b.area && b.area.z !== undefined ? b.area.z : 0);
            if (za !== zb) return false;
            if (typeof lineOfSightOverride === "function") return !!lineOfSightOverride(a, b);
            const O = root.UF && root.UF.Objects, L = root.UF && root.UF.Levels;
            const area = a.area ? { x: a.area.x, y: a.area.y, z: za } : null;
            let x0 = a.x | 0, y0 = a.y | 0;
            const x1 = b.x | 0, y1 = b.y | 0;
            const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            for (let guard = 0; guard < 4096; guard++) {
                if (x0 === x1 && y0 === y1) return true;
                const e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
                if (x0 === x1 && y0 === y1) return true;
                if (area && O && typeof O.atIn === "function") {
                    const t = O.atIn(area, x0, y0);
                    const tags = t && Array.isArray(t.tags) ? t.tags : [];
                    if (tags.includes("wall") || tags.includes("door")) return false;
                }
                if (area && L && typeof L.shapeAt === "function") {
                    try { if (L.shapeAt({ area, x: x0, y: y0, z: za }) === "solid") return false; } catch (_) {}
                }
            }
            return true;
        },
        setLineOfSight(fn) {
            lineOfSightOverride = typeof fn === "function" ? fn : null;
        },

        /**
         * Whether a frightened creature can see the source of its fear: any frightened instance whose source unit is in
         * line of sight (a source without a unit counts as seen). opts.fearSourceVisible forces the answer either way.
         * While no source is seen, the disadvantage on attack rolls and ability checks is suspended; the creature still
         * cannot willingly move closer (SRD p. 358).
         */
        fearSourceVisible(unit, opts = {}) {
            if (opts && opts.fearSourceVisible === true) return true;
            if (opts && opts.fearSourceVisible === false) return false;
            if (!unit || !this.has(unit, "frightened")) return false;
            return this.instances(unit, "frightened").some(inst => {
                if (inst.sourceUnitId === null || inst.sourceUnitId === undefined) return true;
                const s = findUnit(inst.sourceUnitId);
                return !!s && this.lineOfSight(unit, s);
            });
        },

        /** Whether `charmer` has charmed `target` (an instance on the target names the charmer as its source). */
        charmerHasAdvantageOver(charmer, target) {
            if (!charmer || !target || !this.has(target, "charmed")) return false;
            return this.instances(target, "charmed").some(inst => inst.sourceUnitId === charmer.id);
        },

        /**
         * Ability check modifiers for a social check `actor` makes against `target` (persuasion, deception,
         * intimidation, performance, or any check flagged opts.social): a charmer has advantage against the creature it
         * charmed (SRD p. 358), on top of the actor's own condition modifiers.
         */
        socialCheckModifiers(actor, target, ability, skill, opts = {}) {
            const social = opts.social === true || ["persuasion", "deception", "intimidation", "performance"].includes(String(skill || "").toLowerCase());
            const merged = Object.assign({}, opts);
            if (social && this.charmerHasAdvantageOver(actor, target)) merged.advantage = true;
            const mods = this.checkModifiers(actor, ability, skill, merged);
            if (social && this.charmerHasAdvantageOver(actor, target)) { mods.advSources.push("charmer_social"); mods.charmerAdvantage = true; } else mods.charmerAdvantage = false;
            return mods;
        },

        canAct(unit) {
            if (isDead(unit)) return false;
            return !this.has(unit, "incapacitated");
        },

        canReact(unit) {
            return this.canAct(unit);
        },

        canMove(unit) {
            if (!this.canAct(unit)) return false;
            return !this.speedZero(unit);
        },

        canSpeak(unit) {
            if (isDead(unit)) return false;
            return !this.has(unit, "paralyzed") &&
                   !this.has(unit, "petrified") &&
                   !this.has(unit, "unconscious");
        },

        canHear(unit) {
            if (isDead(unit)) return false;
            return !this.has(unit, "deafened") &&
                   !this.has(unit, "petrified") &&
                   !this.has(unit, "unconscious");
        },

        canSee(unit) {
            if (isDead(unit)) return false;
            return !this.has(unit, "blinded") &&
                   !this.has(unit, "petrified") &&
                   !this.has(unit, "unconscious");
        },

        speedZero(unit) {
            if (isDead(unit)) return true;
            if (this.has(unit, "grappled") ||
                this.has(unit, "restrained") ||
                this.has(unit, "paralyzed") ||
                this.has(unit, "petrified") ||
                this.has(unit, "stunned") ||
                this.has(unit, "unconscious")) {
                return true;
            }
            if (exhaustionOf(unit) >= 5) return true;
            return false;
        },

        speedFactor(unit) {
            if (this.speedZero(unit)) return 0;
            const exh = exhaustionOf(unit);
            let factor = 1.0;
            if (exh >= 2) factor = Math.min(factor, 0.5);
            if (this.has(unit, "prone")) factor = Math.min(factor, 0.5); // crawl only
            return factor;
        },

        /**
         * Frightened movement constraint: creature cannot willingly move closer to the source of its fear.
         */
        canWillinglyMoveTo(unit, targetX, targetY) {
            if (!unit || !this.has(unit, "frightened")) return true;
            const insts = this.instances(unit, "frightened");
            const ux = unit.x | 0, uy = unit.y | 0;

            for (const inst of insts) {
                if (inst.sourceUnitId === null || inst.sourceUnitId === undefined) continue;
                const fearSource = findUnit(inst.sourceUnitId);
                if (!fearSource) continue;
                const fx = fearSource.x | 0, fy = fearSource.y | 0;
                const currentDist = Math.max(Math.abs(ux - fx), Math.abs(uy - fy));
                const targetDist = Math.max(Math.abs(targetX - fx), Math.abs(targetY - fy));
                // Moving closer is prohibited
                if (targetDist < currentDist) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Charmed targeting constraint: creature cannot attack or harmful-target the charmer.
         */
        canHarmfullyTarget(attacker, target) {
            if (!attacker || !target) return true;
            if (!this.has(attacker, "charmed")) return true;
            const insts = this.instances(attacker, "charmed");
            for (const inst of insts) {
                if (inst.sourceUnitId !== null && inst.sourceUnitId !== undefined && inst.sourceUnitId === target.id) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Critical hit modifier: any attack that hits a paralyzed or unconscious target
         * is a critical hit if the attacker is within 5 feet (1 cell Chebyshev).
         */
        critOnHit(attacker, target, dist) {
            if (!target) return false;
            const d = dist !== undefined ? dist : chebyshevDist(attacker, target);
            if (d <= 1) {
                return this.has(target, "paralyzed") || this.has(target, "unconscious");
            }
            return false;
        },

        /**
         * Damage multiplier: petrified creatures have resistance to all damage (half damage).
         */
        damageMultiplier(unit, damageType = null) {
            if (this.has(unit, "petrified")) return 0.5;
            return 1.0;
        },

        /**
         * Weight multiplier: petrified creatures and their gear increase in weight by x10.
         */
        weightMultiplier(unit) {
            if (this.has(unit, "petrified")) return 10;
            return 1;
        },

        //---------------------------------------------------------------------
        // Common Effect Resolvers (5e Rules Integration)
        //---------------------------------------------------------------------

        /**
         * Resolves attack roll advantage and disadvantage from both attacker and target conditions.
         * Implements standard SRD 5.1 advantage/disadvantage cancellation.
         */
        attackRollModifiers(attacker, target, opts = {}) {
            const advSources = [];
            const disSources = [];

            if (opts.advantage) advSources.push("option_advantage");
            if (opts.disadvantage) disSources.push("option_disadvantage");

            const dist = opts.distance !== undefined ? opts.distance : chebyshevDist(attacker, target);

            // Attacker condition modifiers
            if (attacker) {
                if (this.has(attacker, "invisible")) advSources.push("attacker_invisible");
                if (this.has(attacker, "blinded")) disSources.push("attacker_blinded");
                if (this.has(attacker, "poisoned")) disSources.push("attacker_poisoned");
                if (this.has(attacker, "prone")) disSources.push("attacker_prone");
                if (this.has(attacker, "restrained")) disSources.push("attacker_restrained");
                if (exhaustionOf(attacker) >= 3) disSources.push("attacker_exhaustion_3");

                // Frightened: disadvantage on attack rolls while a source of the fear is in line of sight
                if (this.has(attacker, "frightened") && this.fearSourceVisible(attacker, opts)) {
                    disSources.push("attacker_frightened");
                }
            }

            // Target condition modifiers
            if (target) {
                if (this.has(target, "blinded")) advSources.push("target_blinded");
                if (this.has(target, "paralyzed")) advSources.push("target_paralyzed");
                if (this.has(target, "petrified")) advSources.push("target_petrified");
                if (this.has(target, "restrained")) advSources.push("target_restrained");
                if (this.has(target, "stunned")) advSources.push("target_stunned");
                if (this.has(target, "unconscious")) advSources.push("target_unconscious");
                if (this.has(target, "invisible")) disSources.push("target_invisible");

                // Prone target: advantage if within 5 feet (<= 1 cell), disadvantage otherwise
                if (this.has(target, "prone")) {
                    if (dist <= 1) {
                        advSources.push("target_prone_melee");
                    } else {
                        disSources.push("target_prone_ranged");
                    }
                }
            }

            // SRD cancellation: multiple advantages or disadvantages do not stack
            const hasAdv = advSources.length > 0;
            const hasDis = disSources.length > 0;

            return {
                advantage: hasAdv && !hasDis,
                disadvantage: hasDis && !hasAdv,
                advSources,
                disSources
            };
        },

        /**
         * Resolves ability check modifiers (advantage, disadvantage, auto-fail).
         */
        checkModifiers(unit, ability, skill, opts = {}) {
            let autoFail = false;
            let autoFailReason = null;
            const advSources = [];
            const disSources = [];

            if (opts.advantage) advSources.push("option_advantage");
            if (opts.disadvantage) disSources.push("option_disadvantage");

            if (unit) {
                // Sight check auto-fail when Blinded
                const requiresSight = !!opts.requiresSight || (skill && String(skill).toLowerCase() === "perception" && opts.requiresHearing !== true);
                if (requiresSight && !this.canSee(unit)) {
                    autoFail = true;
                    autoFailReason = "blinded";
                }

                // Hearing check auto-fail when Deafened
                const requiresHearing = !!opts.requiresHearing;
                if (requiresHearing && !this.canHear(unit)) {
                    autoFail = true;
                    autoFailReason = "deafened";
                }

                if (this.has(unit, "poisoned")) disSources.push("poisoned");
                if (exhaustionOf(unit) >= 1) disSources.push("exhaustion_1");

                // Frightened: disadvantage on ability checks while a source of the fear is in line of sight
                if (this.has(unit, "frightened") && this.fearSourceVisible(unit, opts)) {
                    disSources.push("frightened");
                }

                // Charmed: charmer has advantage on social ability checks against charmed creature
                if (opts.charmerSocialCheck && this.has(unit, "charmed")) {
                    const insts = this.instances(unit, "charmed");
                    const isCharmer = opts.charmerId !== undefined && insts.some(i => i.sourceUnitId === opts.charmerId);
                    if (isCharmer) {
                        advSources.push("charmed_social");
                    }
                }
            }

            const hasAdv = advSources.length > 0;
            const hasDis = disSources.length > 0;

            return {
                autoFail,
                autoFailReason,
                advantage: hasAdv && !hasDis,
                disadvantage: hasDis && !hasAdv,
                advSources,
                disSources
            };
        },

        /**
         * Resolves saving throw modifiers (advantage, disadvantage, auto-fail).
         */
        saveModifiers(unit, ability, opts = {}) {
            const abKey = String(ability || "").toLowerCase();
            let autoFail = false;
            let autoFailReason = null;
            const advSources = [];
            const disSources = [];

            if (opts.advantage) advSources.push("option_advantage");
            if (opts.disadvantage) disSources.push("option_disadvantage");

            if (unit) {
                // Auto-fail Strength and Dexterity saving throws
                if (abKey === "str" || abKey === "dex") {
                    if (this.has(unit, "paralyzed")) {
                        autoFail = true;
                        autoFailReason = "paralyzed";
                    } else if (this.has(unit, "petrified")) {
                        autoFail = true;
                        autoFailReason = "petrified";
                    } else if (this.has(unit, "stunned")) {
                        autoFail = true;
                        autoFailReason = "stunned";
                    } else if (this.has(unit, "unconscious")) {
                        autoFail = true;
                        autoFailReason = "unconscious";
                    }
                }

                // Restrained: disadvantage on Dexterity saving throws
                if (abKey === "dex" && this.has(unit, "restrained")) {
                    disSources.push("restrained_dex_save");
                }

                // Exhaustion 3+: disadvantage on all saving throws
                if (exhaustionOf(unit) >= 3) {
                    disSources.push("exhaustion_3_saves");
                }
            }

            const hasAdv = advSources.length > 0;
            const hasDis = disSources.length > 0;

            return {
                autoFail,
                autoFailReason,
                advantage: hasAdv && !hasDis,
                disadvantage: hasDis && !hasAdv,
                advSources,
                disSources
            };
        },

        /**
         * Returns an aggregated snapshot of all condition-driven effects on a unit.
         */
        effects(unit, context = {}) {
            return {
                canAct: this.canAct(unit),
                canReact: this.canReact(unit),
                canMove: this.canMove(unit),
                canSpeak: this.canSpeak(unit),
                canHear: this.canHear(unit),
                canSee: this.canSee(unit),
                speedZero: this.speedZero(unit),
                speedFactor: this.speedFactor(unit),
                isProne: this.has(unit, "prone"),
                isInvisible: this.has(unit, "invisible"),
                isBlind: !this.canSee(unit),
                isDeaf: !this.canHear(unit),
                damageMultiplier: this.damageMultiplier(unit),
                weightMultiplier: this.weightMultiplier(unit),
                immunePoisonDisease: this.has(unit, "petrified"),
                agingCeased: this.has(unit, "petrified"),
                unaware: this.has(unit, "petrified") || this.has(unit, "unconscious"),
                dropsHeldItems: this.has(unit, "unconscious"),
                falteringSpeech: this.has(unit, "stunned")
            };
        },

        //---------------------------------------------------------------------
        // Duration & Lifecycle Ticking
        //---------------------------------------------------------------------

        /**
         * Ticks a unit's active condition instances, expiring finished durations
         * and resolving condition break triggers (e.g. grappler incapacitated or moved away).
         */
        tick(unit, currentTick = now()) {
            if (!unit || !unit.data || !unit.data.conditions) return;
            const store = unit.data.conditions;

            for (const cid of Object.keys(store)) {
                const entry = store[cid];
                if (!entry || !Array.isArray(entry.instances)) continue;

                for (let i = entry.instances.length - 1; i >= 0; i--) {
                    const inst = entry.instances[i];
                    let expired = false;

                    // Duration expiration
                    if (inst.expiresAt !== null && inst.expiresAt <= currentTick) {
                        expired = true;
                    }

                    // Grapple break check: ends if the grappler is gone, dead, incapacitated or out of reach (>1 cell)
                    if (!expired && inst.condition === "grappled" && inst.sourceUnitId !== null && inst.sourceUnitId !== undefined) {
                        const grappler = findUnit(inst.sourceUnitId);
                        if (!grappler || isDead(grappler) || !this.canAct(grappler) || chebyshevDist(unit, grappler) > 1) {
                            expired = true;
                        }
                    }

                    if (expired) {
                        entry.instances.splice(i, 1);
                        if (inst.condition === "grappled") noteGrapple(inst.sourceUnitId, unit.id, false);
                        emit("condition:expired", unit, inst);
                        emit("condition:removed", unit, inst);
                    }
                }

                if (entry.instances.length === 0) {
                    delete store[cid];
                }
            }
        },

        /**
         * Ticks conditions for an array of units.
         */
        tickAll(units, currentTick = now()) {
            if (!Array.isArray(units)) return;
            for (const u of units) {
                this.tick(u, currentTick);
            }
        }
    };

    let lineOfSightOverride = null;

    root.UF.Conditions = Conditions;
    root.DEUS.Conditions = Conditions;

    // The world's own events keep the invariants without a scan: a creature downed at 0 hit points (DEUS_Combat)
    // drops what it holds and lets go of anyone it grappled; a dead or removed creature lets go too.
    if (root.UF.Events && typeof root.UF.Events.on === "function") {
        root.UF.Events.on("combat:downed", ev => {
            const t = ev && ev.target;
            if (!t || !t.data) return;
            dropHeldItems(t);
            releaseGrapplesHeldBy(t, "grappler downed");
        });
        root.UF.Events.on("colonists:died", u => releaseGrapplesHeldBy(u, "grappler died"));
        root.UF.Events.on("combat:kill", ev => releaseGrapplesHeldBy(ev && ev.target, "grappler killed"));
        root.UF.Events.on("world:unitRemoved", u => releaseGrapplesHeldBy(u, "grappler gone"));
    }

})();
