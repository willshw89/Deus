//=============================================================================
// UF_Time.js - Multi-Domain Time Architecture
// Engine Ticks, Tactical Action Time, Historical Simulation & Presentation Clock
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Time] Authoritative multi-domain time architecture: Engine Ticks (20 Hz computation), Tactical Action Clock (6s d20 rounds), Historical Clock (1s = 2h biological aging), and Presentation Clock (60m solar cycle).
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 *
 * @help
 * Implements the core Project DEUS time invariant:
 * A WORLD TICK IS COMPUTATION != A ROUND IS TACTICAL RULES-TIME !=
 * A YEAR IS HISTORICAL TIME != THE SUN USES PRESENTATION-TIME.
 *
 * Four Independent Time Domains:
 * 1. Engine Clock (World Ticks):
 *    20 Hz logical tick heartbeat, 60 Hz display frames. Pure computation,
 *    zero fictional duration. Timers: afterTicks, everyTicks.
 *
 * 2. Tactical Action Clock (Rules-Time):
 *    1 Round ~ 6 Action Seconds. 10 Rounds ~ 1 Action Minute.
 *    Governs tactical combat encounters, initiative, action budgets,
 *    reactions, combat spell durations, and round-based conditions.
 *    Combat never freezes the rest of the civilization.
 *    Timers: afterRounds, afterActionSeconds.
 *
 * 3. Historical Clock (Biological & Ecological Simulation):
 *    1 real second = 2 historical hours.
 *    240 real seconds = 1 historical year. 4 real hours = 60 historical years.
 *    Governs biological age, gestation, natural mortality, generational
 *    succession, and ecological succession. Never compressed by combat.
 *    Timers: afterHistoricalHours, afterHistoricalDays, afterHistoricalYears.
 *
 * 4. Presentation Clock (Visual Sky & Solar Cycle):
 *    ~60 real minutes per complete solar day/night cycle (~30m day, ~30m night).
 *    Governs sun position, shadow angles, and ambient lighting tone.
 *    Timers: afterPresentationMinutes.
 *
 * Domain-Tagged Timers:
 *   UF.Time.schedule({ domain: "action"|"historical"|"presentation"|"engine", duration, fn })
 *
 * Pause:
 *   Space pauses all 4 domains simultaneously with zero drift.
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};

    const emit = (name, ...args) => {
        if (root.UF && root.UF.Events && root.UF.Events.emit) root.UF.Events.emit(name, ...args);
    };

    // Global pause flag (stopping all 4 domains)
    let isPaused = false;
    let speedMultiplier = 1;
    let nextTimerId = 1;

    // -------------------------------------------------------------------------
    // 1. ENGINE CLOCK (World Ticks - 20 Hz Computation Heartbeat)
    // -------------------------------------------------------------------------

    const engineTimers = new Map(); // id -> { due, fn, repeat }
    let engineTicks = 0;
    let engineFrames = 0;

    const Engine = {
        hz: 20,
        get ticks() { return engineTicks; },
        get frames() { return engineFrames; },

        after(ticks, fn) {
            const id = nextTimerId++;
            engineTimers.set(id, { due: engineTicks + Math.max(1, ticks | 0), fn, repeat: 0 });
            return id;
        },

        every(ticks, fn) {
            const id = nextTimerId++;
            const n = Math.max(1, ticks | 0);
            engineTimers.set(id, { due: engineTicks + n, fn, repeat: n });
            return id;
        },

        cancel(id) {
            return engineTimers.delete(id);
        },

        tick() {
            if (isPaused) return;
            engineTicks++;
            for (const [id, timer] of Array.from(engineTimers.entries())) {
                if (engineTicks >= timer.due) {
                    try { timer.fn(); } catch (err) { console.error("[UF_Time.Engine] Timer error:", err); }
                    if (timer.repeat > 0) {
                        timer.due = engineTicks + timer.repeat;
                    } else {
                        engineTimers.delete(id);
                    }
                }
            }
        },

        frame() {
            if (isPaused) return;
            engineFrames++;
        }
    };

    // -------------------------------------------------------------------------
    // 2. TACTICAL ACTION CLOCK (Rules-Time: 1 Round = 6s, 10 Rounds = 1 min)
    // -------------------------------------------------------------------------

    const actionTimers = new Map(); // id -> { dueRound, fn, repeat }
    const activeEncounters = new Map(); // id -> encounterState
    let globalActionRound = 0;
    let globalActionSeconds = 0;

    const Action = {
        ROUND_SECONDS: 6,
        ROUNDS_PER_MINUTE: 10,

        get round() { return globalActionRound; },
        get actionSeconds() { return globalActionSeconds; },
        get encounters() { return activeEncounters; },

        startEncounter(id, combatants = []) {
            const encounter = {
                id,
                round: 1,
                actionSeconds: 6,
                state: "active",
                turnIndex: 0,
                initiativeList: [],
                combatants: new Set(combatants),
                combatantStates: new Map()
            };
            for (const uid of combatants) {
                encounter.combatantStates.set(uid, {
                    unitId: uid,
                    initiative: 10,
                    speedFeet: 30,
                    speedCells: 6,
                    movementRemainingFeet: 30,
                    movementRemainingCells: 6,
                    actions: { action: 1, bonusAction: 1, reaction: 1 }
                });
            }
            activeEncounters.set(id, encounter);
            emit("tactical:encounterStarted", encounter);
            return encounter;
        },

        endEncounter(id) {
            const enc = activeEncounters.get(id);
            if (enc) {
                enc.state = "resolved";
                activeEncounters.delete(id);
                emit("tactical:encounterEnded", enc);
                return true;
            }
            return false;
        },

        getEncounter(id) {
            return activeEncounters.get(id) || null;
        },

        isUnitInCombat(unitId) {
            for (const enc of activeEncounters.values()) {
                if (enc.combatants && enc.combatants.has(unitId)) return true;
            }
            return false;
        },

        enrollCombatant(encounterId, unitId, initiative = 10, speedFeet = 30) {
            let enc = activeEncounters.get(encounterId);
            if (!enc) {
                enc = Action.startEncounter(encounterId, [unitId]);
            } else {
                enc.combatants.add(unitId);
            }
            if (!enc.combatantStates) enc.combatantStates = new Map();
            const cells = Math.floor(speedFeet / 5);
            enc.combatantStates.set(unitId, {
                unitId,
                initiative,
                speedFeet,
                speedCells: cells,
                movementRemainingFeet: speedFeet,
                movementRemainingCells: cells,
                actions: { action: 1, bonusAction: 1, reaction: 1 }
            });
            enc.initiativeList.push({ unitId, initiative });
            enc.initiativeList.sort((a, b) => b.initiative - a.initiative);
            emit("tactical:combatantEnrolled", enc, unitId, initiative);
            return enc;
        },

        getCombatant(encounterId, unitId) {
            const enc = activeEncounters.get(encounterId);
            return (enc && enc.combatantStates && enc.combatantStates.get(unitId)) || null;
        },

        spendMovement(encounterId, unitId, cells = 1) {
            const cState = Action.getCombatant(encounterId, unitId);
            if (!cState) return false;
            const feet = cells * 5;
            if (cState.movementRemainingFeet < feet) return false;
            cState.movementRemainingFeet -= feet;
            cState.movementRemainingCells = Math.floor(cState.movementRemainingFeet / 5);
            return true;
        },

        useAction(encounterId, unitId, actionType = "action") {
            const cState = Action.getCombatant(encounterId, unitId);
            if (!cState || !cState.actions[actionType]) return false;
            cState.actions[actionType]--;
            return true;
        },

        stepRound(encounterId = null) {
            if (isPaused) return;
            const resetBudgets = enc => {
                if (enc && enc.combatantStates) {
                    for (const cState of enc.combatantStates.values()) {
                        cState.movementRemainingFeet = cState.speedFeet;
                        cState.movementRemainingCells = cState.speedCells;
                        cState.actions = { action: 1, bonusAction: 1, reaction: 1 };
                    }
                }
            };
            if (encounterId) {
                const enc = activeEncounters.get(encounterId);
                if (enc && enc.state === "active") {
                    enc.round++;
                    enc.actionSeconds += Action.ROUND_SECONDS;
                    enc.turnIndex = 0;
                    resetBudgets(enc);
                    emit("tactical:roundBoundary", enc);
                }
            } else {
                globalActionRound++;
                globalActionSeconds += Action.ROUND_SECONDS;
                for (const enc of activeEncounters.values()) {
                    if (enc.state === "active") {
                        enc.round++;
                        enc.actionSeconds += Action.ROUND_SECONDS;
                        enc.turnIndex = 0;
                        resetBudgets(enc);
                        emit("tactical:roundBoundary", enc);
                    }
                }
                // Check action timers
                for (const [id, timer] of Array.from(actionTimers.entries())) {
                    if (globalActionRound >= timer.dueRound) {
                        try { timer.fn(); } catch (err) { console.error("[UF_Time.Action] Timer error:", err); }
                        if (timer.repeat > 0) {
                            timer.dueRound = globalActionRound + timer.repeat;
                        } else {
                            actionTimers.delete(id);
                        }
                    }
                }
            }
        },

        afterRounds(rounds, fn) {
            const id = nextTimerId++;
            actionTimers.set(id, { dueRound: globalActionRound + Math.max(1, rounds | 0), fn, repeat: 0 });
            return id;
        },

        afterActionSeconds(seconds, fn) {
            const rounds = Math.ceil(seconds / Action.ROUND_SECONDS);
            return Action.afterRounds(rounds, fn);
        },

        cancel(id) {
            return actionTimers.delete(id);
        }
    };

    // -------------------------------------------------------------------------
    // 3. HISTORICAL / BIOLOGICAL CLOCK (1s real = 2h historical, 240s = 1 year)
    // -------------------------------------------------------------------------

    const historicalTimers = new Map(); // id -> { dueHours, fn, repeat }
    let historicalRealSeconds = 0;
    let totalHistoricalHours = 0; // 1 real second = 2 historical hours

    const Historical = {
        REAL_SECONDS_PER_YEAR: 240,
        HISTORICAL_HOURS_PER_REAL_SECOND: 2.0,
        HISTORICAL_DAYS_PER_YEAR: 20, // 480 historical hours per year = 20 days (24h/day)

        get realSeconds() { return historicalRealSeconds; },
        get totalHours() { return totalHistoricalHours; },
        get totalDays() { return Math.floor(totalHistoricalHours / 24); },
        get totalYears() { return Math.floor(totalHistoricalHours / 480); },

        date() {
            const totalH = totalHistoricalHours;
            const year = Math.floor(totalH / 480) + 1;
            const dayOfYear = Math.floor((totalH % 480) / 24) + 1;
            const hour = Math.floor(totalH % 24);
            const minute = Math.floor((totalH * 60) % 60);

            // 4 seasons per year: Spring (days 1-5), Summer (6-10), Autumn (11-15), Winter (16-20)
            let season = "Spring";
            if (dayOfYear > 15) season = "Winter";
            else if (dayOfYear > 10) season = "Autumn";
            else if (dayOfYear > 5) season = "Summer";

            return { year, season, dayOfYear, day: dayOfYear, hour, minute };
        },

        biologicalAge(birthYear = 1, birthDay = 1) {
            const curYear = Historical.totalYears + 1;
            const curDay = (Historical.totalDays % Historical.HISTORICAL_DAYS_PER_YEAR) + 1;
            let age = curYear - birthYear;
            if (curDay < birthDay) age = Math.max(0, age - 1);
            return age;
        },

        advanceSeconds(sec) {
            if (isPaused) return;
            const effectiveSec = sec * speedMultiplier;
            historicalRealSeconds += effectiveSec;
            totalHistoricalHours += effectiveSec * Historical.HISTORICAL_HOURS_PER_REAL_SECOND;

            for (const [id, timer] of Array.from(historicalTimers.entries())) {
                if (totalHistoricalHours >= timer.dueHours) {
                    try { timer.fn(); } catch (err) { console.error("[UF_Time.Historical] Timer error:", err); }
                    if (timer.repeat > 0) {
                        timer.dueHours = totalHistoricalHours + timer.repeat;
                    } else {
                        historicalTimers.delete(id);
                    }
                }
            }
        },

        afterHours(hours, fn) {
            const id = nextTimerId++;
            historicalTimers.set(id, { dueHours: totalHistoricalHours + Math.max(0.1, hours), fn, repeat: 0 });
            return id;
        },

        afterDays(days, fn) {
            return Historical.afterHours(days * 24, fn);
        },

        afterYears(years, fn) {
            return Historical.afterHours(years * 480, fn);
        },

        cancel(id) {
            return historicalTimers.delete(id);
        }
    };

    // -------------------------------------------------------------------------
    // 4. PRESENTATION / SKY CLOCK (60 real minutes solar day/night cycle)
    // -------------------------------------------------------------------------

    const presentationTimers = new Map(); // id -> { dueMinutes, fn, repeat }
    let presentationRealSeconds = 0;

    const Presentation = {
        SOLAR_CYCLE_REAL_MINUTES: 60, // 3600 real seconds = 1 solar cycle (~30m day, ~30m night)

        get cycleSeconds() { return presentationRealSeconds % (Presentation.SOLAR_CYCLE_REAL_MINUTES * 60); },
        get cycleMinutes() { return Presentation.cycleSeconds / 60; },
        get cycleProgress() { return Presentation.cycleSeconds / (Presentation.SOLAR_CYCLE_REAL_MINUTES * 60); },

        phase() {
            const prog = Presentation.cycleProgress;
            // 0.00 - 0.05: Dawn (3 min)
            // 0.05 - 0.50: Day (27 min)
            // 0.50 - 0.55: Dusk (3 min)
            // 0.55 - 1.00: Night (27 min)
            if (prog < 0.05) return "dawn";
            if (prog < 0.50) return "day";
            if (prog < 0.55) return "dusk";
            return "night";
        },

        sunAngleDegrees() {
            return Math.round(Presentation.cycleProgress * 360);
        },

        screenTone() {
            const prog = Presentation.cycleProgress;
            if (prog >= 0.05 && prog < 0.50) {
                return [0, 0, 0, 0]; // Day
            } else if (prog < 0.05) {
                // Dawn transition from night [-68, -68, 0, 68] to day [0, 0, 0, 0]
                const t = prog / 0.05;
                const r = Math.round(-68 * (1 - t));
                const g = Math.round(-68 * (1 - t));
                const gray = Math.round(68 * (1 - t));
                return [r, g, 0, gray];
            } else if (prog >= 0.50 && prog < 0.55) {
                // Dusk transition to night
                const t = (prog - 0.50) / 0.05;
                const r = Math.round(-68 * t);
                const g = Math.round(-68 * t);
                const gray = Math.round(68 * t);
                return [r, g, 0, gray];
            } else {
                // Night
                return [-68, -68, 0, 68];
            }
        },

        advanceSeconds(sec) {
            if (isPaused) return;
            const effectiveSec = sec * speedMultiplier;
            presentationRealSeconds += effectiveSec;
            const currentMins = presentationRealSeconds / 60;

            for (const [id, timer] of Array.from(presentationTimers.entries())) {
                if (currentMins >= timer.dueMinutes) {
                    try { timer.fn(); } catch (err) { console.error("[UF_Time.Presentation] Timer error:", err); }
                    if (timer.repeat > 0) {
                        timer.dueMinutes = currentMins + timer.repeat;
                    } else {
                        presentationTimers.delete(id);
                    }
                }
            }
        },

        afterMinutes(minutes, fn) {
            const id = nextTimerId++;
            const currentMins = presentationRealSeconds / 60;
            presentationTimers.set(id, { dueMinutes: currentMins + Math.max(0.1, minutes), fn, repeat: 0 });
            return id;
        },

        cancel(id) {
            return presentationTimers.delete(id);
        }
    };

    // -------------------------------------------------------------------------
    // Top-Level Multi-Domain Time Interface & Schedule Dispatcher
    // -------------------------------------------------------------------------

    const Time = {
        Engine,
        Action,
        Historical,
        Presentation,

        get paused() { return isPaused; },
        multiplier: () => speedMultiplier,

        pause() {
            if (isPaused) return false;
            isPaused = true;
            emit("time:paused");
            return true;
        },

        resume() {
            if (!isPaused) return false;
            isPaused = false;
            emit("time:resumed");
            return true;
        },

        togglePause() {
            return isPaused ? Time.resume() : Time.pause();
        },

        setMultiplier(mult) {
            speedMultiplier = Math.max(1, Math.min(32, mult | 0));
            emit("time:speedChanged", speedMultiplier);
            return speedMultiplier;
        },

        /**
         * Authoritative domain-tagged timer scheduler.
         * @param {Object} opts { domain: "action"|"historical"|"presentation"|"engine", duration, fn, repeat }
         */
        schedule(opts) {
            if (!opts || typeof opts.fn !== "function") return null;
            const domain = opts.domain || "engine";
            const dur = opts.duration || 1;

            if (domain === "action") {
                return Action.afterRounds(dur, opts.fn);
            } else if (domain === "historical") {
                return Historical.afterHours(dur, opts.fn);
            } else if (domain === "presentation") {
                return Presentation.afterMinutes(dur, opts.fn);
            } else {
                return Engine.after(dur, opts.fn);
            }
        },

        /**
         * Polymorphic timer scheduling:
         * UF.Time.after(ticks, fn) -> Engine ticks
         * UF.Time.after("action", rounds, fn) -> Action rounds
         * UF.Time.after("historical", hours, fn) -> Historical hours
         * UF.Time.after("presentation", minutes, fn) -> Presentation minutes
         */
        after(arg1, arg2, arg3) {
            if (typeof arg1 === "string") {
                return Time.schedule({ domain: arg1, duration: arg2, fn: arg3 });
            } else {
                // Legacy engine tick timer
                return Engine.after(arg1, arg2);
            }
        },

        cancel(id) {
            return Engine.cancel(id) || Action.cancel(id) || Historical.cancel(id) || Presentation.cancel(id);
        },

        /**
         * Main logical tick updater called by RMMZ game loop.
         * @param {Number} deltaRealSeconds Real seconds elapsed since last update (usually 1/60)
         */
        update(deltaRealSeconds = 1 / 60) {
            if (isPaused) return;

            // 1. Advance Engine ticks
            Engine.tick();
            Engine.frame();

            // 2. Advance Historical simulation time
            Historical.advanceSeconds(deltaRealSeconds);

            // 3. Advance Presentation sky time
            Presentation.advanceSeconds(deltaRealSeconds);
        },

        /**
         * Resets all clocks to initial conditions (for tests and new game initialization).
         */
        reset() {
            isPaused = false;
            speedMultiplier = 1;
            engineTicks = 0;
            engineFrames = 0;
            engineTimers.clear();
            globalActionRound = 0;
            globalActionSeconds = 0;
            activeEncounters.clear();
            actionTimers.clear();
            historicalRealSeconds = 0;
            totalHistoricalHours = 0;
            historicalTimers.clear();
            presentationRealSeconds = 0;
            presentationTimers.clear();
        }
    };

    // Attach to UF namespace safely copying property descriptors (avoiding getter collision)
    if (!root.UF.Time) root.UF.Time = {};
    const descriptors = Object.getOwnPropertyDescriptors(Time);
    if (typeof root.UF.Time.multiplier === "function") {
        delete descriptors.multiplier;
    }
    Object.defineProperties(root.UF.Time, descriptors);

})();


