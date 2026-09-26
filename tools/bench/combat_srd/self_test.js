"use strict";
// Gate for tools/bench_combat_srd.js --self-test. Headless: real UF.Rules, the
// due-bucket scheduler, and the sim/render split. No NW.js.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { bindRules } = require("../../rules/bind");
const roster = require("./roster");
const schedule = require("./schedule");
const account = require("./account");

const ROOT = path.resolve(__dirname, "..", "..", "..");

function run() {
    let failed = 0;
    function need(cond, name, detail) {
        if (cond) {
            console.log("PASS " + name + (detail ? " - " + detail : ""));
        } else {
            failed++;
            console.error("FAIL " + name + (detail ? " - " + detail : ""));
        }
    }

    const rules = bindRules();
    const rng = schedule.mulberry32(0x5eed0019);
    const seenIds = {};
    for (let i = 0; i < roster.SPECS.length; i++) {
        const spec = roster.SPECS[i];
        seenIds[spec.srdId] = true;
        let row = null;
        let err = null;
        try {
            const a = roster.stampUnit(rules, spec, i, 0);
            const b = roster.stampUnit(rules, spec, 1000 + i, 0);
            const hit = roster.strike(rules, a.unit, b.unit, spec, rng);
            row = { a: a, hit: hit };
        } catch (e) {
            err = e;
        }
        const att = row && row.hit.attack;
        const dmg = row && row.hit.damage;
        const ok = !err && att && att.fromStatBlock === true && att.sameZViolation !== true
            && dmg && typeof dmg.damage === "number" && Number.isFinite(dmg.damage)
            && row.a.creature.id === spec.srdId
            && row.a.unit.data.combatLevels === undefined
            && row.a.hp > 0;
        need(ok, "stat_block_" + spec.id, err ? err.message : (spec.srdId + " hp " + (row && row.a.hp) + " " + spec.weaponKey + " dmg " + (dmg && dmg.damage)));
    }
    const specIds = {};
    for (let i = 0; i < roster.SPECS.length; i++) specIds[roster.SPECS[i].id] = true;
    need(roster.SPECS.length === 14 && Object.keys(specIds).length === 14, "fourteen_distinct_specs", roster.SPECS.length + " specs");
    need(Object.keys(seenIds).length >= 12, "roster_covers_stat_blocks", Object.keys(seenIds).length + " stat blocks");

    let refused = false;
    try {
        roster.stampUnit(rules, { id: "levels", combatLevels: { attack: 60, strength: 60, defence: 60, hitpoints: 99 } }, 0, 0);
    } catch (e) {
        refused = e && e.code === "COMBAT_LEVELS_ONLY";
    }
    need(refused, "refused_combat_levels_only");
    need(roster.refusesCombatLevelsOnly({ combatLevels: { attack: 1 } }) === true, "combat_levels_detector");

    const commoner = roster.stampUnit(rules, { id: "x", srdId: "srd:creature:commoner", role: "melee", weaponKey: "club", every: [40, 0] }, 1, 0);
    need(commoner.creature.id === "srd:creature:commoner", "commoner_block_exists_and_is_not_on_the_roster");
    need(!roster.SPECS.some(s => s.srdId === "srd:creature:commoner"), "roster_does_not_use_commoner_fallback");

    const count = roster.SCREEN_COLS * roster.SCREEN_ROWS;
    const population = roster.buildRoster(count);
    const bodies = [];
    for (let i = 0; i < population.length; i++) {
        const entry = population[i];
        const stamped = roster.stampUnit(rules, entry, i, entry.z);
        entry.unit = stamped.unit;
        bodies.push(entry);
    }
    const byZ = [[], [], []];
    for (let i = 0; i < bodies.length; i++) byZ[bodies[i].z].push(bodies[i]);
    for (let z = 0; z < 3; z++) {
        const list = byZ[z];
        for (let i = 0; i < list.length; i++) list[i].target = list[(i + 1) % list.length];
    }

    let reads = 0;
    let counting = false;
    const tracked = new Proxy(bodies, {
        get(target, prop) {
            if (counting && (prop === Symbol.iterator || (typeof prop === "string" && /^\d+$/.test(prop)))) reads++;
            const value = Reflect.get(target, prop, target);
            return typeof value === "function" ? value.bind(target) : value;
        }
    });
    const scheduler = schedule.createScheduler(tracked);
    counting = true;
    const simByFrame = [];
    let attacks = 0;
    let moved = 0;
    let notStat = 0;
    const frames = 600;
    for (let frame = 1; frame <= frames; frame++) {
        let sim = 0;
        scheduler.step(frame, (unit, now) => {
            const woken = schedule.wake(unit, now, schedule.MOVE_EVERY);
            if (woken.moved) moved++;
            if (woken.attacked && unit.target) {
                const t0 = performance.now();
                const hit = roster.strike(rules, unit.unit, unit.target.unit, unit, rng);
                sim += performance.now() - t0;
                attacks++;
                if (!hit.attack.fromStatBlock) notStat++;
            }
            return woken.next;
        });
        simByFrame.push(sim);
    }
    const c = scheduler.counters;
    need(c.fullScans === 0, "zero_per_frame_full_scans", "fullScans " + c.fullScans + " over " + c.frames + " frames");
    need(reads === 0, "scheduler_does_not_touch_the_roster", "index/iterator reads " + reads);
    need(attacks > 0 && moved > 0, "due_bucket_fired", attacks + " attacks, " + moved + " moves, maxDue " + c.maxDue + " of " + count);
    need(c.maxDue < count, "no_frame_woke_every_fighter", "maxDue " + c.maxDue + " population " + count);
    need(c.maxDue <= Math.ceil(count / 4), "due_set_stays_a_fraction", "maxDue " + c.maxDue);
    need(notStat === 0, "every_scheduled_attack_used_the_stat_block", "non-stat " + notStat);
    need(c.setupWalks === 1, "one_setup_walk", "setupWalks " + c.setupWalks);

    const simMedian = account.series(simByFrame).median;
    need(simMedian !== null && simMedian < account.BUDGET_MS, "resolution_fits_in_a_60hz_frame", "sim median " + simMedian + " ms, budget " + account.BUDGET_MS.toFixed(3) + " ms");

    const before = c.fullScans;
    scheduler.scanAll(frames + 1, () => {});
    need(c.fullScans === before + 1 && reads > 0, "full_scan_counter_trips_on_a_roster_walk", "fullScans " + c.fullScans + ", reads " + reads);

    const under = account.fpsVerdict(16.6);
    const onLine = account.fpsVerdict(16.7);
    const over = account.fpsVerdict(16.71);
    const slow = account.fpsVerdict(20);
    need(under.met === true && onLine.met === true && over.met === false && slow.met === false, "fps_target_classifier", JSON.stringify({ under: under.met, onLine: onLine.met, over: over.met, slow: slow.met }));

    const split = account.summarize("fixture", [
        { dt: 16.6, tick: 10, draws: 1, at: 1, parts: { "sim.rules": 0.4, render: 8.1 } },
        { dt: 16.6, tick: 10, draws: 1, at: 2, parts: { "sim.rules": 0.5, render: 8.6 } },
        { dt: 16.6, tick: 10, draws: 1, at: 3, parts: { "sim.rules": 0.6, render: 9.1 } }
    ]);
    need(split.simMs.median === 0.5 && split.renderMs.median === 8.6, "sim_and_render_are_separate", "sim " + split.simMs.median + " render " + split.renderMs.median);
    need(split.costs.simulationResolutionMs.median === split.simMs.median && split.costs.renderingMs.median === split.renderMs.median, "cost_block_matches_the_series");
    need(split.target.met === true && split.fps.atMedian > 60, "fixture_frame_meets_60", "fps " + split.fps.atMedian);

    const plugin = path.join(__dirname, "DEUS_BenchCombatSrd.js");
    const syntax = spawnSync(process.execPath, ["-c", plugin], { encoding: "utf8" });
    need(syntax.status === 0, "plugin_syntax", syntax.status === 0 ? "node -c" : String(syntax.stderr || syntax.stdout).split("\n")[0]);
    const src = fs.readFileSync(plugin, "utf8");
    const drive = src.match(/function drive\(\) \{[^}]*\}/);
    need(!!drive && drive[0].indexOf("scheduler.step") >= 0, "drive_steps_the_scheduler");
    need(!!drive && drive[0].indexOf("combatants") < 0 && drive[0].indexOf("scanAll") < 0, "drive_does_not_walk_the_roster");
    for (const file of ["roster.js", "schedule.js", "account.js", "load.js"]) {
        const check = spawnSync(process.execPath, ["-c", path.join(__dirname, file)], { encoding: "utf8" });
        need(check.status === 0, "syntax_" + file, check.status === 0 ? "node -c" : String(check.stderr || "").split("\n")[0]);
    }
    const harness = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Test.js"), "utf8");
    need(harness.indexOf("longer than 180 s") >= 0, "snapshot_watchdog_needle_present");

    if (failed) {
        console.error("SELF-TEST FAIL " + failed);
        process.exit(1);
    }
    console.log("SELF-TEST PASS");
    process.exit(0);
}

module.exports = { run: run };
