"use strict";
// Seeded dice for the SRD 5.1 rules engine (ADR-003). Every roll takes an injected
// rng that returns a number in [0, 1). The same rng sequence and the same expression
// produce the same totals. This file does not read the clock and does not draw its own numbers.

function fail(code, msg) {
    const err = new Error(code + ": " + msg);
    err.name = "DiceError";
    err.code = code;
    throw err;
}

function requireRng(rng) {
    if (typeof rng !== "function") {
        fail("NO_RNG", "dice require an injected rng");
    }
    return rng;
}

// mulberry32. The seed is an integer; the returned function is the injected rng.
function createSeededRng(seed) {
    let a = (seed >>> 0);
    return function rng() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function rollDie(sides, rng) {
    const fn = requireRng(rng);
    const n = sides | 0;
    if (n < 1) fail("BAD_DIE", "a die needs at least 1 side");
    const u = fn();
    if (typeof u !== "number" || !(u >= 0 && u < 1)) {
        fail("BAD_RNG", "rng must return a number in [0, 1)");
    }
    return Math.floor(u * n) + 1;
}

// One d20. Advantage keeps the higher of two rolls, disadvantage the lower.
// Both at once cancel (one roll), which is the SRD rule.
function rollD20(rng, opts) {
    const o = opts || {};
    const advantage = !!o.advantage;
    const disadvantage = !!o.disadvantage;
    const first = rollDie(20, rng);
    if (advantage === disadvantage) {
        return { natural: first, rolls: [first], advantage: false, disadvantage: false };
    }
    const second = rollDie(20, rng);
    const natural = advantage ? Math.max(first, second) : Math.min(first, second);
    return { natural: natural, rolls: [first, second], advantage: advantage, disadvantage: disadvantage };
}

// "1d8+3", "2d6", "1d4+1d6", "11d8 + 44", "2d6 - 1", "1".
// Returns { dice: [{ count, sides }], modifier, text }.
function parseExpression(expr) {
    if (typeof expr === "number" && Number.isFinite(expr)) {
        return { dice: [], modifier: expr, text: String(expr) };
    }
    if (expr && typeof expr === "object" && Array.isArray(expr.dice)) return expr;
    const text = String(expr == null ? "" : expr).replace(/[–—−]/g, "-").replace(/\s+/g, "");
    if (!text) fail("BAD_EXPRESSION", "empty dice expression");
    const dice = [];
    let modifier = 0;
    const re = /([+-]?)(\d+)d(\d+)|([+-]?)(\d+)/g;
    let matched = 0;
    let m;
    while ((m = re.exec(text))) {
        matched += m[0].length;
        if (m[2] !== undefined) {
            const sign = m[1] === "-" ? -1 : 1;
            const count = sign * parseInt(m[2], 10);
            const sides = parseInt(m[3], 10);
            if (!(sides >= 1)) fail("BAD_EXPRESSION", "bad die in " + text);
            dice.push({ count: count, sides: sides });
        } else {
            const sign = m[4] === "-" ? -1 : 1;
            modifier += sign * parseInt(m[5], 10);
        }
    }
    if (matched !== text.length || (dice.length === 0 && modifier === 0 && text !== "0")) {
        fail("BAD_EXPRESSION", "cannot parse " + String(expr));
    }
    return { dice: dice, modifier: modifier, text: text };
}

// Critical hits roll every damage die twice and add the modifier once.
function rollExpression(expr, rng, opts) {
    const parsed = parseExpression(expr);
    const critical = !!(opts && opts.critical);
    const rolls = [];
    let diceTotal = 0;
    for (let i = 0; i < parsed.dice.length; i++) {
        const group = parsed.dice[i];
        const sign = group.count < 0 ? -1 : 1;
        const n = Math.abs(group.count) * (critical ? 2 : 1);
        for (let k = 0; k < n; k++) {
            const face = rollDie(group.sides, rng);
            rolls.push(face);
            diceTotal += sign * face;
        }
    }
    const modifier = parsed.modifier;
    return {
        total: diceTotal + modifier,
        rolls: rolls,
        diceTotal: diceTotal,
        modifier: modifier,
        critical: critical,
        parsed: parsed,
        diceRolled: diceRolled(parsed, critical)
    };
}

function diceRolled(parsed, critical) {
    if (!parsed.dice.length) return "0";
    const parts = [];
    for (let i = 0; i < parsed.dice.length; i++) {
        const group = parsed.dice[i];
        const sign = group.count < 0 ? -1 : 1;
        const n = Math.abs(group.count) * (critical ? 2 : 1);
        const bit = String(sign < 0 ? -n : n) + "d" + group.sides;
        if (i === 0) parts.push(bit.replace(/^\+/, ""));
        else parts.push((sign < 0 || group.count < 0 ? "" : "+") + bit);
    }
    return parts.join("");
}

function expressionMax(expr) {
    const parsed = parseExpression(expr);
    let max = parsed.modifier;
    for (let i = 0; i < parsed.dice.length; i++) {
        const group = parsed.dice[i];
        const sign = group.count < 0 ? -1 : 1;
        max += sign * Math.abs(group.count) * group.sides;
    }
    return max;
}

module.exports = {
    createSeededRng: createSeededRng,
    requireRng: requireRng,
    rollDie: rollDie,
    rollD20: rollD20,
    parseExpression: parseExpression,
    rollExpression: rollExpression,
    diceRolled: diceRolled,
    expressionMax: expressionMax
};
