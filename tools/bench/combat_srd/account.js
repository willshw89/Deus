"use strict";
// Frame accounting. Simulation resolution (UF.Rules.attack / damage) and render
// submission are separate accumulators. Neither is derived by subtracting the other.

const TARGET_FPS = 60;
const BUDGET_MS = 1000 / TARGET_FPS;
// WG.00.09b counts a frame over budget at 16.7 ms (one 60 Hz frame is 16.666... ms).
const OVER_MS = 16.7;

function quantile(arr, p) {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
}

function r3(v) {
    return v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(3);
}

function series(values) {
    if (!values.length) return { median: null, p95: null, worst: null, mean: null };
    let sum = 0;
    let worst = values[0];
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (values[i] > worst) worst = values[i];
    }
    return {
        median: r3(quantile(values, 0.5)),
        p95: r3(quantile(values, 0.95)),
        worst: r3(worst),
        mean: r3(sum / values.length)
    };
}

function fpsVerdict(medianMs) {
    if (medianMs === null || medianMs === undefined || !Number.isFinite(medianMs) || medianMs <= 0) {
        return { met: false, fps: null, budgetMs: r3(BUDGET_MS), overMs: OVER_MS, rule: "median frame interval <= 16.7 ms" };
    }
    const fps = 1000 / medianMs;
    return {
        met: medianMs <= OVER_MS,
        fps: r3(fps),
        budgetMs: r3(BUDGET_MS),
        overMs: OVER_MS,
        rule: "met when the median frame interval is at most 16.7 ms (WG.00.09b over-budget line; a 60 Hz frame is 16.666... ms)"
    };
}

function summarize(phase, frames, extra) {
    const list = frames || [];
    const dts = [];
    const ticks = [];
    const draws = [];
    for (let i = 0; i < list.length; i++) {
        const dt = list[i].dt;
        if (dt > 0) dts.push(dt);
        ticks.push(list[i].tick || 0);
        draws.push(list[i].draws || 0);
    }
    const med = quantile(dts, 0.5);
    const p95 = quantile(dts, 0.95);
    const worst = dts.length ? Math.max.apply(null, dts) : null;
    const partKeys = {};
    for (let i = 0; i < list.length; i++) {
        const parts = list[i].parts || {};
        for (const k in parts) partKeys[k] = true;
    }
    const parts = {};
    const keys = Object.keys(partKeys).sort();
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = [];
        for (let f = 0; f < list.length; f++) v.push((list[f].parts && list[f].parts[k]) || 0);
        parts[k] = series(v);
    }
    const simValues = [];
    const renderValues = [];
    for (let i = 0; i < list.length; i++) {
        const p = list[i].parts || {};
        simValues.push(p["sim.rules"] || 0);
        renderValues.push(p.render || 0);
    }
    const out = {
        phase: phase,
        frames: list.length,
        wallStart: list.length ? list[0].at : null,
        wallEnd: list.length ? list[list.length - 1].at : null,
        frameMs: { median: r3(med), p95: r3(p95), worst: r3(worst) },
        fps: {
            atMedian: med ? r3(1000 / med) : null,
            atP95: p95 ? r3(1000 / p95) : null,
            atWorst: worst ? r3(1000 / worst) : null
        },
        target: fpsVerdict(med),
        over16_7: dts.filter(v => v > OVER_MS).length,
        over33_4: dts.filter(v => v > 33.4).length,
        over50: dts.filter(v => v > 50).length,
        tickMs: series(ticks),
        drawCalls: {
            median: quantile(draws, 0.5),
            p95: quantile(draws, 0.95),
            max: draws.length ? Math.max.apply(null, draws) : null
        },
        simMs: series(simValues),
        renderMs: series(renderValues),
        costs: {
            simulationResolutionMs: series(simValues),
            renderingMs: series(renderValues),
            note: "sim.rules is time inside UF.Rules.attack and UF.Rules.damage. render is time inside the engine render submission. The two accumulators are independent. sim.rules is not render subtracted from the frame."
        },
        parts: parts
    };
    const withCounts = list.filter(f => f.counts);
    if (withCounts.length) {
        const peak = {};
        for (let i = 0; i < withCounts.length; i++) {
            const c = withCounts[i].counts;
            for (const k in c) peak[k] = Math.max(peak[k] || 0, c[k]);
        }
        out.peak = peak;
    }
    if (extra) {
        for (const k in extra) out[k] = extra[k];
    }
    return out;
}

module.exports = {
    TARGET_FPS: TARGET_FPS,
    BUDGET_MS: BUDGET_MS,
    OVER_MS: OVER_MS,
    quantile: quantile,
    series: series,
    fpsVerdict: fpsVerdict,
    summarize: summarize
};
