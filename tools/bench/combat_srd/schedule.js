"use strict";
// Due-bucket combat clock. A frame visits only the fighters whose move or attack
// is due. Walking the whole roster is scanAll, and that increments fullScans.
// The stress driver calls step, never scanAll.

const MOVE_EVERY = 16;

function createCounters() {
    return { frames: 0, dueVisits: 0, fullScans: 0, setupWalks: 0, maxDue: 0 };
}

function createScheduler(units) {
    const buckets = new Map();
    const counters = createCounters();

    function schedule(unit, frame) {
        let list = buckets.get(frame);
        if (!list) {
            list = [];
            buckets.set(frame, list);
        }
        list.push(unit);
    }

    function arm(startFrame) {
        buckets.clear();
        counters.setupWalks++;
        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            unit.nextMove = startFrame + unit.movePhase;
            unit.nextAttack = startFrame + unit.attackPhase;
            schedule(unit, Math.min(unit.nextMove, unit.nextAttack));
        }
    }

    function step(frame, visit) {
        const due = buckets.get(frame);
        if (due) buckets.delete(frame);
        const list = due || [];
        counters.frames++;
        counters.dueVisits += list.length;
        if (list.length > counters.maxDue) counters.maxDue = list.length;
        for (let i = 0; i < list.length; i++) {
            const next = visit(list[i], frame);
            const when = typeof next === "number" && next > frame ? next : frame + 1;
            schedule(list[i], when);
        }
    }

    // The forbidden per-frame walk. Tests call it to prove the counter moves.
    function scanAll(frame, visit) {
        counters.fullScans++;
        counters.frames++;
        for (let i = 0; i < units.length; i++) visit(units[i], frame);
        counters.dueVisits += units.length;
    }

    arm(0);
    return {
        population: units.length,
        counters: counters,
        arm: arm,
        step: step,
        scanAll: scanAll
    };
}

// Advance one due fighter. Returns the next bucket stamp. Does not look at siblings.
function wake(unit, frame, moveEvery) {
    const stepFrames = moveEvery || MOVE_EVERY;
    let moved = false;
    let attacked = false;
    if (frame >= unit.nextMove) {
        unit.nextMove = frame + stepFrames;
        moved = true;
    }
    if (frame >= unit.nextAttack) {
        unit.nextAttack = frame + unit.interval;
        attacked = true;
    }
    return { next: Math.min(unit.nextMove, unit.nextAttack), moved: moved, attacked: attacked };
}

function mulberry32(seed) {
    let a = seed | 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let x = Math.imul(a ^ (a >>> 15), 1 | a);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

module.exports = {
    MOVE_EVERY: MOVE_EVERY,
    createCounters: createCounters,
    createScheduler: createScheduler,
    wake: wake,
    mulberry32: mulberry32
};
