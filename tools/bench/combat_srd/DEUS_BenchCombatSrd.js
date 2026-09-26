//=============================================================================
// DEUS_BenchCombatSrd.js - GENERATED into a snapshot copy by tools/bench_combat_srd.js.
// Not part of the game. SIM.60.06 stress: SRD stat-block units, UF.Rules resolution
// timed apart from render, due-bucket driver (no per-frame roster walk).
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [bench] SIM.60.06 SRD combat stress (snapshot copies only).
 */
(() => {
    "use strict";
    const path = require("path");
    const fs = require("fs");
    const lib = process.env.BENCH_LIB;
    const roster = require(path.join(lib, "roster.js"));
    const schedule = require(path.join(lib, "schedule.js"));
    const account = require(path.join(lib, "account.js"));

    const Test = () => (window.UF && UF.Test && UF.Test.active ? UF.Test : null);
    const OUT = process.env.BENCH_OUT;
    const SECONDS = Math.max(1, Number(process.env.BENCH_SECONDS || "30") || 30);
    const MODE = process.env.BENCH_MODE || "both";
    const now = () => performance.now();

    const acc = Object.create(null);
    const add = (key, ms) => { acc[key] = (acc[key] || 0) + ms; };
    let recording = null;
    let lastStart = 0;
    let drawCalls = 0;
    let tickStart = 0;
    let benchDriver = null;
    const tally = {
        rulesCalls: 0,
        fromStatBlock: 0,
        hostAttacks: 0,
        hostErrors: 0,
        rulesAttacks: 0,
        killingBlows: 0,
        worldUpdateCalls: 0,
        unitsInAreaCalls: 0
    };

    function onTickStart() {
        const t = now();
        const dt = lastStart ? t - lastStart : 0;
        lastStart = t;
        tickStart = t;
        for (const k in acc) delete acc[k];
        drawCalls = 0;
        return dt;
    }
    function onTickEnd(dt) {
        const tick = now() - tickStart;
        if (!recording) return;
        const parts = {};
        for (const k in acc) parts[k] = +acc[k].toFixed(3);
        const rec = { dt: +dt.toFixed(3), tick: +tick.toFixed(3), draws: drawCalls, parts: parts, at: Date.now() };
        if (recording.counters) rec.counts = recording.counters();
        recording.frames.push(rec);
    }
    function installTick() {
        const app = Graphics._app;
        if (!app || app.__benchCombatTick) return;
        app.__benchCombatTick = true;
        const ticker = app.ticker;
        const orig = Graphics._onTick;
        ticker.remove(orig, Graphics);
        Graphics._onTick = function (deltaTime) {
            const dt = onTickStart();
            try { orig.call(this, deltaTime); }
            finally { onTickEnd(dt); }
        };
        ticker.add(Graphics._onTick, Graphics);
        const render = app.render;
        if (typeof render === "function") {
            app.render = function () {
                const t = now();
                try { return render.apply(this, arguments); }
                finally { add("render", now() - t); }
            };
        }
        const gl = app.renderer && app.renderer.gl;
        if (gl) {
            for (const fn of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
                const o = gl[fn];
                if (typeof o === "function") gl[fn] = function () { drawCalls++; return o.apply(this, arguments); };
            }
        }
    }
    function installRules(UF) {
        const Rules = UF && UF.Rules;
        if (!Rules || Rules.__benchWrapped) return;
        Rules.__benchWrapped = true;
        const attack = Rules.attack;
        const damage = Rules.damage;
        Rules.attack = function () {
            const t = now();
            try {
                const r = attack.apply(this, arguments);
                tally.rulesCalls++;
                if (r && r.fromStatBlock) tally.fromStatBlock++;
                return r;
            } finally { add("sim.rules", now() - t); }
        };
        Rules.damage = function () {
            const t = now();
            try { return damage.apply(this, arguments); }
            finally { add("sim.rules", now() - t); }
        };
    }
    function installObservations(UF) {
        const W = UF && UF.World;
        if (W && !W.__benchObserved) {
            W.__benchObserved = true;
            const update = W.update;
            W.update = function () {
                tally.worldUpdateCalls++;
                return update.apply(this, arguments);
            };
            const area = W.unitsInArea;
            W.unitsInArea = function () {
                tally.unitsInAreaCalls++;
                return area.apply(this, arguments);
            };
        }
        const C = UF && UF.Combat;
        if (C && !C.__benchSustain) {
            C.__benchSustain = true;
            // The stress keeps every stat-block unit on screen for the whole window.
            // The real onUnitDeath removes the unit; this bench hook counts the blow and restores printed HP.
            C.onUnitDeath = function (victim) {
                tally.killingBlows++;
                if (victim && victim.data) {
                    victim.data.dead = false;
                    victim.data._isDying = false;
                    victim.data.hp = victim.data.maxHp || victim.data.hp || 1;
                }
                return false;
            };
        }
    }

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        if (benchDriver) benchDriver();
        _Scene_Map_update.call(this);
    };
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);
        if (!Test()) return;
        registerSuite();
    };
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function () {
        _Scene_Map_start.call(this);
        if (!Test()) return;
        installTick();
    };

    const PLACEHOLDERS = {
        arrow: { size: "12x4 px", color: "#8b5a2b", note: "arrow in flight: no arrow sprite in the game" },
        spellOrb: { size: "10x10 px", color: "#ff7a1a", note: "spell projectile in flight: no spell projectile in the game" },
        impactLower: { size: "24x24 px", color: "#ffd24a", note: "impact on a lower level: RMMZ animations need a Game_Event" }
    };
    const ANIM = { slash: 6, pierce: 11, fire: 66 };

    function registerSuite() {
        const T = Test();
        T.suite("bench_combat_srd", async t => {
            const UF = window.UF;
            installRules(UF);
            installObservations(UF);
            const W = UF.World, L = UF.Levels, D = UF.Depth, C = UF.Combat, I = UF.Items;
            const result = {
                task: "SIM.60.06",
                scenario: "stress",
                mode: MODE,
                seconds: SECONDS,
                seed: "0x5eed0019",
                startedAt: new Date().toISOString(),
                phases: [],
                notes: [],
                placeholders: PLACEHOLDERS
            };
            const rng = schedule.mulberry32(0x5eed0019);
            try {
                if (C) C.enabled = false;
                if (UF.Time && UF.Time.setForTest) UF.Time.setForTest(12, 0);
                if (UF.Time && UF.Time.setMultiplier) UF.Time.setMultiplier(1);
                const size = W.state.size;
                const area = W.viewLevel();
                const scene = () => SceneManager._scene;
                const proof = proofWindow(W, L, area, size);
                const goTo = async (z, center) => {
                    L.setView(z, { center: center || proof.center });
                    await t.waitUntil(() => !L.switching() && L.view() === z && scene() instanceof Scene_Map && scene().isStarted(), 30000, "view " + z);
                };
                await goTo(2, proof.center);
                await t.waitFrames(20);
                const cells = visibleCells(W, L, area, size);
                const combatants = [];
                for (let k = 0; k < cells.length; k++) {
                    const spec = roster.SPECS[k % roster.SPECS.length];
                    const timing = roster.timing(spec, k);
                    const cell = cells[k];
                    const data = roster.unitData(spec);
                    const u = W.addUnit({
                        name: "SRD_stress_" + k,
                        image: { characterName: roster.SHEETS[k % roster.SHEETS.length], characterIndex: 0 },
                        area: { x: area.x, y: area.y },
                        x: cell.x, y: cell.y, z: cell.z, dir: 2, exact: true, data: data
                    });
                    const creature = UF.Rules.creatureOf(u);
                    if (!creature || creature.id !== spec.srdId) throw new Error("SRD_MISMATCH " + spec.id + " -> " + (creature && creature.id));
                    const hp = UF.Rules.hitPoints(creature).hp;
                    u.data.hp = hp;
                    u.data.maxHp = hp;
                    u.data.srdHp = hp;
                    if (spec.ammo && I && I.give) I.give(spec.ammo, 9999, u.id);
                    combatants.push({
                        u: u,
                        specId: spec.id,
                        srdId: spec.srdId,
                        species: spec.species || null,
                        role: spec.role,
                        weaponKey: spec.weaponKey,
                        attackKind: spec.attackKind || "weapon",
                        host: spec.host,
                        interval: timing.interval,
                        attackPhase: timing.attackPhase,
                        movePhase: timing.movePhase,
                        home: { x: cell.x, y: cell.y },
                        target: null,
                        z: cell.z
                    });
                }
                const byLevel = { 2: [], 1: [], 0: [] };
                for (let i = 0; i < combatants.length; i++) {
                    const s = combatants[i];
                    (byLevel[s.z] || (byLevel[s.z] = [])).push(s);
                }
                for (const key of Object.keys(byLevel)) {
                    const list = byLevel[key];
                    for (let i = 0; i < list.length; i++) list[i].target = list.length > 1 ? list[(i + 1) % list.length] : null;
                }
                const roles = { melee: 0, archer: 0, caster: 0 };
                const srdIds = {};
                let combatLevels = 0;
                for (let i = 0; i < combatants.length; i++) {
                    const s = combatants[i];
                    roles[s.role] = (roles[s.role] || 0) + 1;
                    srdIds[s.srdId] = (srdIds[s.srdId] || 0) + 1;
                    if (s.u.data.combatLevels) combatLevels++;
                }
                result.stress = {
                    cells: cells.length,
                    units: combatants.length,
                    byLevel: { "+2": (byLevel[2] || []).length, "+1": (byLevel[1] || []).length, "0": (byLevel[0] || []).length },
                    roles: roles,
                    srdIds: srdIds,
                    combatLevels: combatLevels,
                    zoom: UF.Camera && UF.Camera.zoom ? UF.Camera.zoom() : null,
                    effectPaths: {
                        walk: "due bucket, UF.World.sendUnit ping-pong",
                        melee: "host resolveAttack when the catalog key matches the stat-block action; otherwise UF.Rules.attack",
                        arrows: "visual placeholder; the SRD ranged attack resolves on the due frame",
                        spells: "printed spell action through UF.Rules (hurl flame, shock, life drain); visual orb",
                        sustain: "bench onUnitDeath counts a killing blow and restores printed HP so the unit stays in the window"
                    }
                };
                const scheduler = schedule.createScheduler(combatants);
                const flights = [];
                const impacts = [];
                let frame = 0;
                let resolving = false;
                let lastDue = 0;
                const px = (x, y) => ({ x: ($gameMap.adjustX(x) + 0.5) * 48, y: ($gameMap.adjustY(y) + 0.5) * 48 });
                const hostOf = z => {
                    const ss = SceneManager._scene && SceneManager._scene._spriteset;
                    if (!ss) return null;
                    if (z === L.view()) return ss._tilemap;
                    const root = D && D.root ? D.root() : null;
                    const plane = root ? root.planes.find(q => q.level && q.level.z === z) : null;
                    return plane ? plane._entities : null;
                };
                const solid = (w, h, color) => {
                    const s = new PIXI.Sprite(PIXI.Texture.WHITE);
                    s.width = w; s.height = h; s.tint = color; s.anchor.set(0.5, 0.5); s.z = 9999;
                    return s;
                };
                const evOf = u => (W.eventOf ? W.eventOf(u.id) : null);
                const animate = (u, id) => {
                    const ev = u && u.z === L.view() ? evOf(u) : null;
                    if (ev && window.$gameTemp) { $gameTemp.requestAnimation([ev], id); return true; }
                    return false;
                };
                const restore = u => {
                    if (!u || !u.data) return;
                    u.data.dead = false;
                    u.data._isDying = false;
                    u.data.hp = u.data.maxHp || u.data.hp;
                };
                const resolveOne = s => {
                    const attacker = s.u;
                    const target = s.target && s.target.u;
                    if (!attacker || !target) return;
                    if (s.host && C && C.resolveAttack) {
                        try {
                            const r = C.resolveAttack(attacker, target, { bypassGcd: true, rng: rng });
                            if (r) tally.hostAttacks++;
                            else tally.hostErrors++;
                        } catch (e) {
                            tally.hostErrors++;
                            result.notes.push("resolveAttack " + s.specId + ": " + (e && e.message));
                        }
                        restore(target);
                        restore(attacker);
                        return;
                    }
                    const call = { rng: rng, spell: s.attackKind === "spell" };
                    const att = UF.Rules.attack(attacker, target, s.weaponKey, call);
                    UF.Rules.damage(attacker, target, att, call);
                    tally.rulesAttacks++;
                };
                const launch = (s, kind) => {
                    const host = hostOf(s.u.z);
                    if (!host || !s.target || !s.target.u) return;
                    const sp = kind === "arrow" ? solid(12, 4, 0x8b5a2b) : solid(10, 10, 0xff7a1a);
                    host.addChild(sp);
                    flights.push({
                        sp: sp, kind: kind,
                        from: { x: s.u.x, y: s.u.y },
                        to: s.target.u,
                        t: 0,
                        dur: kind === "arrow" ? 20 : 30
                    });
                };
                const impactAt = u => {
                    const host = hostOf(u.z);
                    if (!host) return;
                    const sp = solid(24, 24, 0xffd24a);
                    const p = px(u.x, u.y);
                    sp.x = p.x; sp.y = p.y;
                    host.addChild(sp);
                    impacts.push({ sp: sp, left: 18 });
                };
                const pingpong = s => {
                    const u = s.u;
                    if (!u || u.goal) return;
                    const destX = u.x === s.home.x ? (s.home.x + 1) % size : s.home.x;
                    W.sendUnit(u.id, { area: { x: area.x, y: area.y }, x: destX, y: s.home.y, z: u.z });
                };
                const onDue = (s, frameNow) => {
                    const woken = schedule.wake(s, frameNow, schedule.MOVE_EVERY);
                    if (woken.moved) pingpong(s);
                    if (woken.attacked && s.target) {
                        if (resolving) resolveOne(s);
                        if (s.role === "melee" && s.target.u) animate(s.target.u, ANIM.slash);
                        else if (s.role === "archer") launch(s, "arrow");
                        else {
                            if (s.u && s.u.data) s.u.data.casting = s.target.u ? { targetId: s.target.u.id } : true;
                            launch(s, "orb");
                        }
                    }
                    return woken.next;
                };
                const advanceFlights = () => {
                    for (let i = flights.length - 1; i >= 0; i--) {
                        const f = flights[i];
                        f.t++;
                        const a = px(f.from.x, f.from.y);
                        const b = px(f.to.x, f.to.y);
                        const k = Math.min(1, f.t / f.dur);
                        f.sp.x = a.x + (b.x - a.x) * k;
                        f.sp.y = a.y + (b.y - a.y) * k;
                        if (f.t < f.dur) continue;
                        if (f.sp.parent) f.sp.parent.removeChild(f.sp);
                        f.sp.destroy();
                        flights.splice(i, 1);
                        if (!animate(f.to, f.kind === "arrow" ? ANIM.pierce : ANIM.fire)) impactAt(f.to);
                    }
                };
                const advanceImpacts = () => {
                    for (let i = impacts.length - 1; i >= 0; i--) {
                        if (--impacts[i].left > 0) continue;
                        const sp = impacts[i].sp;
                        if (sp.parent) sp.parent.removeChild(sp);
                        sp.destroy();
                        impacts.splice(i, 1);
                    }
                };
                function drive() {
                    frame++;
                    const before = scheduler.counters.dueVisits;
                    scheduler.step(frame, onDue);
                    lastDue = scheduler.counters.dueVisits - before;
                    advanceFlights();
                    advanceImpacts();
                }
                const counters = () => ({
                    projectilesAlive: flights.length,
                    impactsAlive: impacts.length,
                    dueVisits: scheduler.counters.dueVisits,
                    fullScans: scheduler.counters.fullScans,
                    units: combatants.length,
                    lastDue: lastDue
                });
                benchDriver = () => { lastDue = scheduler.counters.dueVisits; drive(); };
                await t.waitFrames(30);

                const runPhase = async (name, hour, doResolve) => {
                    resolving = doResolve;
                    if (UF.Time && UF.Time.setForTest) UF.Time.setForTest(hour, 0);
                    await t.waitFrames(10);
                    flights.length = 0;
                    impacts.length = 0;
                    scheduler.arm(frame);
                    const c0 = {
                        rules: tally.rulesCalls,
                        stat: tally.fromStatBlock,
                        host: tally.hostAttacks,
                        hostErr: tally.hostErrors,
                        direct: tally.rulesAttacks,
                        kills: tally.killingBlows,
                        world: tally.worldUpdateCalls,
                        area: tally.unitsInAreaCalls,
                        scans: scheduler.counters.fullScans
                    };
                    recording = { phase: name, frames: [], counters: counters };
                    const t0 = now();
                    await t.waitUntil(() => now() - t0 >= SECONDS * 1000, SECONDS * 1000 + 60000, name);
                    const frames = recording.frames;
                    recording = null;
                    const summary = account.summarize(name, frames, {
                        wallMs: +(now() - t0).toFixed(1),
                        hour: hour,
                        resolve: doResolve,
                        resolution: {
                            rulesCalls: tally.rulesCalls - c0.rules,
                            fromStatBlock: tally.fromStatBlock - c0.stat,
                            hostAttacks: tally.hostAttacks - c0.host,
                            hostErrors: tally.hostErrors - c0.hostErr,
                            rulesAttacks: tally.rulesAttacks - c0.direct,
                            killingBlows: tally.killingBlows - c0.kills,
                            fullScans: scheduler.counters.fullScans - c0.scans
                        },
                        engine: {
                            worldUpdateCalls: tally.worldUpdateCalls - c0.world,
                            unitsInAreaCalls: tally.unitsInAreaCalls - c0.area
                        }
                    });
                    result.phases.push(summary);
                    t.write("BENCH " + name + ": " + frames.length + " frames, median " + summary.frameMs.median + " ms (" + summary.fps.atMedian + " fps), sim " + summary.simMs.median + " ms, render " + summary.renderMs.median + " ms, fullScans " + summary.resolution.fullScans);
                };

                const wantBase = MODE === "both" || MODE === "base";
                const wantSrd = MODE === "both" || MODE === "srd";
                if (wantBase) {
                    await runPhase("base_day_" + SECONDS + "s", 12, false);
                    await runPhase("base_night_" + SECONDS + "s", 22, false);
                }
                if (wantSrd) {
                    await runPhase("srd_day_" + SECONDS + "s", 12, true);
                    await runPhase("srd_night_" + SECONDS + "s", 22, true);
                }
                benchDriver = null;
                result.resolution = {
                    fullScans: scheduler.counters.fullScans,
                    dueVisits: scheduler.counters.dueVisits,
                    frames: scheduler.counters.frames,
                    setupWalks: scheduler.counters.setupWalks,
                    maxDue: scheduler.counters.maxDue,
                    population: combatants.length,
                    rulesCalls: tally.rulesCalls,
                    fromStatBlock: tally.fromStatBlock,
                    hostAttacks: tally.hostAttacks,
                    hostErrors: tally.hostErrors,
                    rulesAttacks: tally.rulesAttacks,
                    killingBlows: tally.killingBlows
                };
                result.engine = {
                    worldUpdateCalls: tally.worldUpdateCalls,
                    unitsInAreaCalls: tally.unitsInAreaCalls,
                    combatEnabled: C ? C.enabled : null,
                    note: "worldUpdateCalls counts UF.World.update. That function walks every unit (DEUS_World.js). This bench does not change it. fullScans counts combat-roster walks by the stress driver."
                };
                result.finishedAt = new Date().toISOString();
                if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 1));

                const srdPhases = result.phases.filter(p => p.resolve);
                const basePhases = result.phases.filter(p => p.resolve === false);
                const scans = result.resolution.fullScans;
                t.check("zero_per_frame_full_scans", scans === 0 && result.resolution.frames > 0, "fullScans " + scans + " over " + result.resolution.frames + " driver frames, maxDue " + result.resolution.maxDue + " of " + combatants.length);
                t.check("srd_stat_blocks", combatants.length > 0 && combatLevels === 0 && Object.keys(srdIds).length >= 8, combatants.length + " units, " + Object.keys(srdIds).length + " stat blocks, combatLevels " + combatLevels);
                const srdRules = srdPhases.reduce((n, p) => n + (p.resolution ? p.resolution.rulesCalls : 0), 0);
                const srdStat = srdPhases.reduce((n, p) => n + (p.resolution ? p.resolution.fromStatBlock : 0), 0);
                const srdHostErr = srdPhases.reduce((n, p) => n + (p.resolution ? p.resolution.hostErrors : 0), 0);
                t.check("stat_block_resolution", srdPhases.length === 0 || (srdRules > 0 && srdStat === srdRules && srdHostErr === 0), "rules " + srdRules + " fromStatBlock " + srdStat + " hostErrors " + srdHostErr);
                const splitOk = result.phases.every(p => p.simMs && p.renderMs && p.costs && p.costs.simulationResolutionMs && p.costs.renderingMs);
                const baseQuiet = basePhases.every(p => p.resolution && p.resolution.rulesCalls === 0);
                const srdSplit = srdPhases.every(p => typeof p.simMs.median === "number" && typeof p.renderMs.median === "number");
                t.check("sim_and_render_split", splitOk && baseQuiet && (srdPhases.length === 0 || srdSplit), result.phases.map(p => p.phase + " sim " + p.simMs.median + " render " + p.renderMs.median).join("; "));
                t.check("bench_finished", result.phases.length > 0 && !!OUT, result.phases.length + " phase(s)");
                t.check("no_errors", UF.Test.errors.length === 0, UF.Test.errors.length ? UF.Test.errors[0] : "none");
            } catch (e) {
                result.notes.push(String(e && e.stack || e));
                if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
                t.check("bench_finished", false, e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : String(e));
            }
        }, { isDefault: false });
    }

    function proofWindow(W, L, area, size) {
        const S = L.surfaceGrid(area.x, area.y);
        const COLS = roster.SCREEN_COLS;
        const ROWS = roster.SCREEN_ROWS;
        let best = null;
        for (let wy = 0; wy + ROWS <= size; wy += 2) {
            for (let wx = 0; wx + COLS <= size; wx += 2) {
                let n0 = 0, n1 = 0, n2 = 0;
                for (let y = wy; y < wy + ROWS; y++) {
                    for (let x = wx; x < wx + COLS; x++) {
                        const s = S[y * size + x];
                        if (s === 0) n0++;
                        else if (s === 1) n1++;
                        else n2++;
                    }
                }
                const score = Math.min(n0, n1, n2) * 1000 + n1 + n2;
                if (!best || score > best.score) best = { wx: wx, wy: wy, score: score };
            }
        }
        return { best: best, center: { x: best.wx + 8, y: best.wy + 6 } };
    }

    function visibleCells(W, L, area, size) {
        const g = {
            2: L.shapeGrid(2, area.x, area.y),
            1: L.shapeGrid(1, area.x, area.y),
            0: L.shapeGrid(0, area.x, area.y)
        };
        const OPEN = L.SHAPES.open;
        const SOLID = L.SHAPES.solid;
        const walkable = code => code !== OPEN && code !== SOLID && code !== 0;
        const dx0 = Math.floor($gameMap.displayX());
        const dy0 = Math.floor($gameMap.displayY());
        const cols = Math.ceil($gameMap.screenTileX());
        const rows = Math.ceil($gameMap.screenTileY());
        const cells = [];
        for (let y = dy0; y < dy0 + rows; y++) {
            for (let x = dx0; x < dx0 + cols; x++) {
                const wx = ((x % size) + size) % size;
                const wy = ((y % size) + size) % size;
                const i = wy * size + wx;
                let z = null;
                if (walkable(g[2][i])) z = 2;
                else if (g[2][i] === OPEN && walkable(g[1][i])) z = 1;
                else if (g[2][i] === OPEN && g[1][i] === OPEN && walkable(g[0][i])) z = 0;
                if (z !== null && !W.standerAt(area.x, area.y, wx, wy, z)) cells.push({ x: wx, y: wy, z: z });
            }
        }
        return cells;
    }
})();
