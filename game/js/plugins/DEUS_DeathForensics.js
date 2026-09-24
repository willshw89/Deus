//=============================================================================
// RPG Maker MZ - DEUS Death Forensics & Mortality Diagnostics
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Forensics] Structured death forensics, bounded event ring buffers, cause classification, and settlement mortality ledger.
 * @author Deepdelve Architect
 *
 * @help
 * ============================================================================
 * DEUS Death Forensics Plugin
 * ============================================================================
 * Provides:
 * - Structured forensic records on every creature/colonist death
 * - 16-event bounded circular ring buffer per colonist
 * - Causal death classification (combat, fire, lava, starvation, dehydration,
 *   exhaustion, drowning, hypothermia, overheating, poison, falling,
 *   dying/death-saves, trapped/pathing, unknown)
 * - Multi-cause tracking: primaryCause + contributingCauses[]
 * - Settlement mortality ledger and summary API:
 *     UF.Colonists.deathLedger()
 *     UF.Colonists.mortalitySummary()
 *     UF.Colonists.recentEvents(unitId)
 *     UF.Colonists.recordEvent(unit, event)
 * ============================================================================
 */

(() => {
    "use strict";

    const RING_BUFFER_SIZE = 16;
    const VALID_CAUSES = [
        "combat",
        "fire",
        "lava",
        "starvation",
        "dehydration",
        "exhaustion",
        "drowning",
        "hypothermia",
        "overheating",
        "poison",
        "falling",
        "dying/death-saves",
        "trapped/pathing",
        "unknown"
    ];

    // Central state
    const deathLedgerRecords = [];
    const eventRingBuffers = new Map(); // unitId -> Array of up to 16 events
    const lastSafePositions = new Map(); // unitId -> { area, x, y, z, tick }

    function ticks() {
        const W = (typeof window !== "undefined" && window.UF && window.UF.World) || (typeof global !== "undefined" && global.UF && global.UF.World);
        return (W && W.state ? W.state.ticks : 0) || 0;
    }

    function gameDay() {
        if (typeof window !== "undefined" && window.$ufTime && Number.isFinite(window.$ufTime.day)) {
            return window.$ufTime.day;
        }
        if (typeof global !== "undefined" && global.$ufTime && Number.isFinite(global.$ufTime.day)) {
            return global.$ufTime.day;
        }
        return Math.floor(ticks() / 14400) + 1;
    }

    function gameTimeStr() {
        if (typeof window !== "undefined" && window.$ufTime && Number.isFinite(window.$ufTime.hour)) {
            const h = String(window.$ufTime.hour).padStart(2, "0");
            const m = String(window.$ufTime.minute || 0).padStart(2, "0");
            return `${h}:${m}`;
        }
        if (typeof global !== "undefined" && global.$ufTime && Number.isFinite(global.$ufTime.hour)) {
            const h = String(global.$ufTime.hour).padStart(2, "0");
            const m = String(global.$ufTime.minute || 0).padStart(2, "0");
            return `${h}:${m}`;
        }
        const min = Math.floor((ticks() % 14400) / 10);
        const h = String(Math.floor(min / 60) % 24).padStart(2, "0");
        const m = String(min % 60).padStart(2, "0");
        return `${h}:${m}`;
    }

    function copyArea(a) {
        return a ? { x: a.x, y: a.y } : { x: 0, y: 0 };
    }

    function zOf(u) {
        if (!u) return 0;
        if (Number.isFinite(u.z)) return u.z;
        if (u.area && Number.isFinite(u.area.z)) return u.area.z;
        return 0;
    }

    /**
     * Record a significant event in the unit's circular ring buffer.
     * Max 16 items. No every-frame logging.
     */
    function recordEvent(unitOrId, eventObj) {
        if (!unitOrId) return;
        const uid = typeof unitOrId === "number" ? unitOrId : unitOrId.id;
        if (uid === undefined || uid === null) return;

        let buf = eventRingBuffers.get(uid);
        if (!buf) {
            buf = [];
            eventRingBuffers.set(uid, buf);
        }

        const entry = {
            tick: ticks(),
            day: gameDay(),
            time: gameTimeStr(),
            type: eventObj.type || "event",
            text: eventObj.text || "",
            detail: eventObj.detail || null
        };

        buf.push(entry);
        if (buf.length > RING_BUFFER_SIZE) {
            buf.shift();
        }
    }

    function recentEvents(unitOrId) {
        if (!unitOrId) return [];
        const uid = typeof unitOrId === "number" ? unitOrId : unitOrId.id;
        const buf = eventRingBuffers.get(uid);
        return buf ? buf.slice() : [];
    }

    function updateSafePosition(unit) {
        if (!unit || unit.x === undefined || unit.y === undefined) return;
        lastSafePositions.set(unit.id, {
            area: copyArea(unit.area),
            x: unit.x,
            y: unit.y,
            z: zOf(unit),
            tick: ticks()
        });
    }

    function getSafePosition(unit) {
        if (!unit) return null;
        return lastSafePositions.get(unit.id) || {
            area: copyArea(unit.area),
            x: unit.x,
            y: unit.y,
            z: zOf(unit),
            tick: ticks()
        };
    }

    /**
     * Classify the causes of death for a creature.
     * Evaluates raw cause, killer, environmental conditions, and needs.
     */
    function classifyDeath(victim, rawCause, killer) {
        const d = (victim && victim.data) || {};
        const contributing = [];
        let primary = "unknown";

        const n = d.needs || {};
        const condList = [];
        const Cond = (typeof window !== "undefined" && window.UF && window.UF.Conditions) || (typeof global !== "undefined" && global.UF && global.UF.Conditions);
        if (Cond && typeof Cond.all === "function") {
            try {
                const ac = Cond.all(victim);
                for (const c of ac) condList.push(typeof c === "string" ? c : c.id || c.name);
            } catch (_) {}
        }
        if (Array.isArray(d.conditions)) {
            for (const c of d.conditions) {
                const name = typeof c === "string" ? c : c.id || c.name;
                if (!condList.includes(name)) condList.push(name);
            }
        }

        // Check thermal / environmental
        const Env = (typeof window !== "undefined" && window.UF && window.UF.Environment) || (typeof global !== "undefined" && global.UF && global.UF.Environment);
        let thermalStage = "comfortable";
        if (Env && typeof Env.unitThermal === "function") {
            try {
                const t = Env.unitThermal(victim);
                if (t && t.stage) thermalStage = t.stage;
            } catch (_) {}
        }

        // Check fluid / drowning
        const Fluid = (typeof window !== "undefined" && window.UF && window.UF.Fluid) || (typeof global !== "undefined" && global.UF && global.UF.Fluid);
        let fluidClass = "dry";
        if (Fluid && typeof Fluid.depthAt === "function" && victim.area) {
            try {
                const dpt = Fluid.depthAt(victim.area.x, victim.area.y, zOf(victim), victim.x, victim.y);
                fluidClass = Fluid.movementClass(dpt);
            } catch (_) {}
        }

        const isAflame = !!d.burning || rawCause === "fire" || rawCause === "burned";
        const isLava = rawCause === "lava" || (victim.data && victim.data._steppedInLava);
        const isCold = thermalStage === "hypothermia_severe" || thermalStage === "critical" || rawCause === "hypothermia" || rawCause === "cold";
        const isHeat = thermalStage === "heatstroke" || rawCause === "overheating" || rawCause === "heat";
        const isDrown = fluidClass === "submerged" || fluidClass === "lethal" || rawCause === "drowning";
        const isPoison = condList.includes("poisoned") || rawCause === "poison";
        const isDehydrated = rawCause === "thirst" || rawCause === "dehydration" || (n.exhaustion >= 6 && n.waterGal < 0.1);
        const isStarved = rawCause === "hunger" || rawCause === "starvation" || (n.exhaustion >= 6 && n.daysWithoutFood >= 3);
        const isExhausted = n.exhaustion >= 6;
        const isCombat = !!killer || rawCause === "combat" || (d.lastDamagedBy && (ticks() - (d.lastDamagedTick || 0) < 600));
        const isDeathSaves = d.dying && d.dying.failures >= 3;

        // Contributing cause accumulation
        if (isAflame) contributing.push("fire");
        if (isLava) contributing.push("lava");
        if (isCold) contributing.push("hypothermia");
        if (isHeat) contributing.push("overheating");
        if (isDrown) contributing.push("drowning");
        if (isPoison) contributing.push("poison");
        if (isDehydrated) contributing.push("dehydration");
        if (isStarved) contributing.push("starvation");
        if (isExhausted && !isDehydrated && !isStarved) contributing.push("exhaustion");
        if (isCombat) contributing.push("combat");
        if (isDeathSaves) contributing.push("dying/death-saves");
        if (d.trapped || rawCause === "trapped") contributing.push("trapped/pathing");

        // Primary cause determination
        if (rawCause === "lava" || isLava) {
            primary = "lava";
        } else if (rawCause === "fire" || (isAflame && !isCombat)) {
            primary = "fire";
        } else if (rawCause === "drowning" || isDrown) {
            primary = "drowning";
        } else if (rawCause === "thirst" || rawCause === "dehydration") {
            primary = "dehydration";
        } else if (rawCause === "hunger" || rawCause === "starvation") {
            primary = "starvation";
        } else if (rawCause === "hypothermia" || (isCold && !isCombat)) {
            primary = "hypothermia";
        } else if (rawCause === "overheating" || (isHeat && !isCombat)) {
            primary = "overheating";
        } else if (rawCause === "poison" || (isPoison && !isCombat)) {
            primary = "poison";
        } else if (rawCause === "falling" || d._fellFromZ) {
            primary = "falling";
        } else if (isCombat) {
            primary = "combat";
        } else if (isDeathSaves) {
            primary = "dying/death-saves";
        } else if (isExhausted) {
            primary = isDehydrated ? "dehydration" : (isStarved ? "starvation" : "exhaustion");
        } else if (rawCause === "wounds") {
            // Wounds could be combat or previous hazard
            if (isCombat) primary = "combat";
            else if (isAflame) primary = "fire";
            else if (isCold) primary = "hypothermia";
            else primary = "dying/death-saves";
        } else if (rawCause === "old_age") {
            primary = "exhaustion";
            contributing.push("old_age");
        } else if (typeof rawCause === "string" && VALID_CAUSES.includes(rawCause)) {
            primary = rawCause;
        }

        // Remove primary from contributing
        const finalContributing = contributing.filter(c => c !== primary);

        return {
            primaryCause: primary,
            contributingCauses: finalContributing,
            conditions: condList,
            temperatureState: thermalStage,
            burning: isAflame,
            drowning: isDrown,
            poisoned: isPoison
        };
    }

    /**
     * Intercept and generate a structured death forensic record.
     */
    function recordDeath(victim, rawCause, killer) {
        if (!victim || !victim.data) return null;
        const d = victim.data;
        if (d._deathForensicRecorded) return null;
        d._deathForensicRecorded = true;

        const classification = classifyDeath(victim, rawCause, killer);
        const n = d.needs || {};

        let sourceName = null;
        if (killer) {
            sourceName = killer.name || (killer.data && killer.data.kind) || "unknown attacker";
        } else if (rawCause) {
            sourceName = String(rawCause);
        } else if (classification.primaryCause !== "unknown") {
            sourceName = classification.primaryCause;
        }

        const W = (typeof window !== "undefined" && window.UF && window.UF.World) || (typeof global !== "undefined" && global.UF && global.UF.World);
        const J = (typeof window !== "undefined" && window.UF && window.UF.Jobs) || (typeof global !== "undefined" && global.UF && global.UF.Jobs);

        const currentJobObj = J && typeof J.of === "function" ? J.of(victim.id) : null;
        const currentJobType = currentJobObj ? currentJobObj.type : (d._currentJob || null);
        const currentProject = (currentJobObj && currentJobObj.params && currentJobObj.params.project) || d._currentProject || null;
        const currentDecisionRung = Number.isFinite(d._currentDecisionRung) ? d._currentDecisionRung : null;

        const safePos = getSafePosition(victim);

        const record = {
            unitId: victim.id,
            historicalPersonId: d.historicalPersonId || d.personId || null,
            name: victim.name || `Unit #${victim.id}`,
            factionId: d.faction || null,

            gameDay: gameDay(),
            gameTime: gameTimeStr(),
            worldPosition: {
                area: copyArea(victim.area),
                x: victim.x,
                y: victim.y,
                z: zOf(victim)
            },

            deathCause: classification.primaryCause,
            deathSource: sourceName,
            primaryCause: classification.primaryCause,
            contributingCauses: classification.contributingCauses,
            fireProvenance: d.fireProvenance || (function() {
                const Fire = (typeof window !== "undefined" && window.UF && window.UF.Fire) || (typeof global !== "undefined" && global.UF && global.UF.Fire);
                if (Fire && typeof Fire.provenanceAt === "function" && victim.area) {
                    return Fire.provenanceAt(victim.area, victim.x, victim.y);
                }
                return null;
            })(),

            hp: Number.isFinite(d.hp) ? d.hp : 0,
            maxHp: Number.isFinite(d.maxHp) ? d.maxHp : 10,
            exhaustion: Number.isFinite(n.exhaustion) ? n.exhaustion : 0,

            foodToday: Number.isFinite(n.foodLb) ? n.foodLb : 0,
            foodRequired: 1.0,
            waterToday: Number.isFinite(n.waterGal) ? n.waterGal : 0,
            waterRequired: 1.0,
            daysWithoutFood: Number.isFinite(n.daysWithoutFood) ? n.daysWithoutFood : 0,

            conditions: classification.conditions,
            temperatureState: classification.temperatureState,
            burning: classification.burning,
            drowning: classification.drowning,
            poisoned: classification.poisoned,

            currentJob: currentJobType,
            currentProject: currentProject,
            currentDecisionRung: currentDecisionRung,

            lastSafePosition: safePos,
            lastMealTime: Number.isFinite(d._lastMealTime) ? d._lastMealTime : null,
            lastDrinkTime: Number.isFinite(d._lastDrinkTime) ? d._lastDrinkTime : null,
            lastLongRest: Number.isFinite(d._lastLongRest) ? d._lastLongRest : null,

            lastEvents: recentEvents(victim.id)
        };

        // Record in unit's ring buffer that death occurred
        recordEvent(victim, {
            type: "died",
            text: `Died of ${record.primaryCause}${sourceName ? ` (${sourceName})` : ""}`,
            detail: record.primaryCause
        });

        deathLedgerRecords.push(record);

        // Console diagnostic output for F8 observability
        if (record.fireProvenance) {
            const fp = record.fireProvenance;
            console.warn(`[DEATH FORENSICS] ${record.name} died of fire on Day ${record.gameDay} at ${record.gameTime} at (${record.worldPosition.x},${record.worldPosition.y}). Fire Provenance: ID=${fp.fireId}, started at ${fp.startedAt ? fp.startedAt.time : "?"} (day ${fp.startedAt ? fp.startedAt.day : "?"}), source=${fp.sourceType} (${fp.sourceObjectId || "none"}) at (${fp.sourceCell ? `${fp.sourceCell.x},${fp.sourceCell.y}` : "?"}), initial fuel=${fp.firstFuelIgnited}, parent chain=[${(fp.spreadParents || []).join("->")}].`);
        } else {
            console.warn(`[DEATH FORENSICS] ${record.name} died on Day ${record.gameDay} at ${record.gameTime} at (${record.worldPosition.x},${record.worldPosition.y},z=${record.worldPosition.z}). Cause: ${record.primaryCause} (source: ${record.deathSource}). Contributing: [${record.contributingCauses.join(", ")}]. HP: ${record.hp}/${record.maxHp}, Exh: ${record.exhaustion}, Food: ${record.foodToday}/1.0, Water: ${record.waterToday}/1.0. Last safe pos: (${safePos.x},${safePos.y}).`);
        }

        // Emit death forensics event
        const Events = (typeof window !== "undefined" && window.UF && window.UF.Events) || (typeof global !== "undefined" && global.UF && global.UF.Events);
        if (Events && typeof Events.emit === "function") {
            Events.emit("forensics:death", record);
        }

        return record;
    }

    function deathLedger() {
        return deathLedgerRecords.slice();
    }

    function mortalitySummary() {
        const byCause = {};
        for (const c of VALID_CAUSES) byCause[c] = 0;
        for (const r of deathLedgerRecords) {
            const cause = r.primaryCause || "unknown";
            byCause[cause] = (byCause[cause] || 0) + 1;
        }
        return {
            totalDeaths: deathLedgerRecords.length,
            byCause,
            ledger: deathLedgerRecords.slice()
        };
    }

    function resetDeathLedger() {
        deathLedgerRecords.length = 0;
        eventRingBuffers.clear();
        lastSafePositions.clear();
    }

    // Attach to namespaces
    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};
    root.DEUS = root.DEUS || root.UF;

    const DeathForensics = {
        recordDeath,
        recordEvent,
        recentEvents,
        updateSafePosition,
        getSafePosition,
        classifyDeath,
        deathLedger,
        mortalitySummary,
        resetDeathLedger,
        VALID_CAUSES
    };

    root.UF.DeathForensics = DeathForensics;
    root.UF.Forensics = DeathForensics;
    root.DEUS.DeathForensics = DeathForensics;

    // Mirror to UF.Colonists
    function linkColonists() {
        if (root.UF && root.UF.Colonists) {
            root.UF.Colonists.deathLedger = deathLedger;
            root.UF.Colonists.mortalitySummary = mortalitySummary;
            root.UF.Colonists.recordEvent = recordEvent;
            root.UF.Colonists.recentEvents = recentEvents;
            root.UF.Colonists.resetDeathLedger = resetDeathLedger;
        }
    }
    linkColonists();

    // Hook lifecycle events
    function hookLifecycleEvents() {
        const E = root.UF && root.UF.Events;
        if (!E || !E.on) return;

        E.on("colonists:died", (u, cause) => {
            try { recordDeath(u, cause, null); } catch (e) { console.error("Forensics died hook:", e); }
        });
        E.on("combat:kill", ev => {
            try { if (ev && ev.target) recordDeath(ev.target, "combat", ev.attacker); } catch (e) { console.error("Forensics kill hook:", e); }
        });
        E.on("colonists:dying", u => {
            try {
                recordEvent(u, { type: "entered dying", text: "Collapsed and started dying" });
            } catch (_) {}
        });
        E.on("colonists:stabilized", (u, how) => {
            try {
                recordEvent(u, { type: "stabilized", text: `Stabilized via ${how || "first aid"}` });
            } catch (_) {}
        });
        E.on("colonists:conscious", (u, how) => {
            try {
                recordEvent(u, { type: "resumed work", text: `Regained consciousness (${how || "rest"})` });
            } catch (_) {}
        });
        E.on("colonists:exhaustion", (u, level, cause) => {
            try {
                recordEvent(u, { type: "became exhausted", text: `Exhaustion reached level ${level} (${cause})` });
            } catch (_) {}
        });
        E.on("combat:hit", ev => {
            try {
                if (ev && ev.target) {
                    recordEvent(ev.target, { type: "combat hit", text: `Hit for ${ev.damage || 0} damage by ${(ev.attacker && ev.attacker.name) || "attacker"}` });
                }
            } catch (_) {}
        });
        E.on("jobs:done", (job, u) => {
            try {
                if (u && job) {
                    if (job.type === "drink") {
                        if (u.data) u.data._lastDrinkTime = ticks();
                        recordEvent(u, { type: "drank", text: "Drank water" });
                    } else if (job.type === "eat") {
                        if (u.data) u.data._lastMealTime = ticks();
                        recordEvent(u, { type: "ate", text: `Ate ${(job.params && job.params.itemType) || "food"}` });
                    } else if (job.type === "sleep") {
                        if (u.data) u.data._lastLongRest = ticks();
                        recordEvent(u, { type: "woke", text: "Woke from sleep" });
                    } else {
                        recordEvent(u, { type: "job done", text: `Finished job: ${job.type}` });
                    }
                }
            } catch (_) {}
        });
        E.on("jobs:failed", job => {
            try {
                if (job && job.assigned) {
                    recordEvent(job.assigned, { type: "job cancelled", text: `Job ${job.type} failed: ${job.reason || "unknown"}` });
                }
            } catch (_) {}
        });
        E.on("world:unitMoved", (u, from, to) => {
            try {
                // If destination has no fire and is walkable, record as safe pos
                const Fire = root.UF && root.UF.Fire;
                const isFire = Fire && typeof Fire.isBurning === "function" && Fire.isBurning(copyArea(u.area), to.x, to.y);
                if (!isFire) {
                    updateSafePosition(u);
                }
            } catch (_) {}
        });
    }

    if (root.UF && root.UF.Events) {
        hookLifecycleEvents();
    } else if (typeof setTimeout !== "undefined") {
        setTimeout(hookLifecycleEvents, 50);
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = DeathForensics;
    }
})();
