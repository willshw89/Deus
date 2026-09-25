/*
 * tools/smoke_19a_playtest.js
 *
 * DEUS-TSK-FABLE-19A native smoke gate (owner direction 2026-09-24, "FABLE-19A OWNER REVIEW / INTEGRATION DECISIONS"
 * section 5). A console script for an RMMZ Playtest: nothing here is loaded by the game. tools/native_smoke_19a.js runs
 * the same steps by DevTools; by hand:
 *
 *   1. RPG Maker MZ: open the project, F5, New Game; wait for the map. No error screen; F8 -> Console shows no red
 *      errors other than "Failed to load resource ... img/characters/$gen_*.json" (the optional sprite sidecars, missing
 *      in the project since before 19A). This script only counts errors from the moment it is pasted.
 *   2. F8 -> Console: paste this whole file, Enter.
 *   3. await __smoke19a.run()      -> Z0 checked, the camera panned to an ordinary generated part of the ground (look at
 *                                     it), then level -1: a 4-cell tunnel dug with applyVolumeDamage and the camera
 *                                     centred on it (look at it: rock before, a floor corridor now), one stratum damaged
 *                                     (HP only), the game saved to a free slot. The world is paused (TimeSpeed) for the
 *                                     whole smoke so nothing grows or walks between the save and the check; frames still
 *                                     run, also while DevTools has the focus (both restored by cleanup()).
 *   4. await __smoke19a.reload()   -> that slot loaded through the game's own Load screen.
 *   5. await __smoke19a.verify()   -> the dug strata and the HP persisted, the cells round the tunnel and a control block
 *                                     far away are unchanged, the baselines regenerated from the seed equal the ones
 *                                     before the save, the game is running with no error screen, no console errors since
 *                                     step 2; the view goes back to Z0 and then to the tunnel.
 *   6. Optional cold check: close the Playtest, F5 again, Continue -> the smoke's slot, press Space (pause) as soon as the
 *      map shows, paste this file again, await __smoke19a.verify() (the expectation is kept in localStorage).
 *   7. await __smoke19a.cleanup()  -> deletes the save slot the smoke wrote (only if the file is still the one it wrote)
 *                                     and puts back console.error, the listeners, the focus rule, the save slot the game
 *                                     had, the camera follow and the view.
 *
 * Each check prints "[smoke19a] PASS name - detail" or "[smoke19a] FAIL name - detail"; __smoke19a.report() prints them
 * all again. "KNOWN objects_underground" is not a FAIL: the natural objects of -1 differ after a load on the pre-strata
 * build too (measured on 2d5fc47, 2026-09-24); strata, shapes and ground objects are what the gate judges. The gate passes when every line is PASS and what you saw matches: the far ground area, the tunnel after
 * step 3 and after step 4 (and 6).
 */
(() => {
    "use strict";
    const VERSION = 2;
    const old = window.__smoke19a;
    const S = old && old.version === VERSION ? old : { version: VERSION, lines: [], errors: [], errStart: 0, expect: null, keep: null, hooks: null };
    window.__smoke19a = S;
    const LOG = "[smoke19a]", STORE = "smoke19a";
    const L = () => window.UF && UF.Levels, W = () => window.UF && UF.World;
    const LEVELS = [-2, -1, 0, 1, 2];
    const say = (name, ok, detail) => {
        const line = `${ok ? "PASS" : "FAIL"} ${name} - ${detail}`;
        S.lines.push(line);
        (ok ? console.log : console.warn)(`${LOG} ${line}`);
        return !!ok;
    };
    const known = (name, detail) => {
        const line = `KNOWN ${name} - ${detail}`;
        S.lines.push(line);
        console.warn(`${LOG} ${line}`);
    };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const until = async (test, ms, what) => {
        const t0 = performance.now();
        while (performance.now() - t0 < ms) {
            try { if (test()) return true; } catch (e) { /* not ready */ }
            await sleep(50);
        }
        throw new Error(`timed out after ${ms} ms waiting for ${what}`);
    };
    const frames = async n => { const f0 = Graphics.frameCount; await until(() => Graphics.frameCount >= f0 + n, 5000 + n * 100, `${n} frames`); };
    const mapReady = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging()
        && !$gamePlayer.isTransferring() && !(L().switching && L().switching());
    const ref = (area, x, y, z) => ({ area: { x: area.x, y: area.y }, x, y, z });
    const strataKey = s => s ? `${s.bytes.join(",")}|${s.hp.join(",")}|${s.connector || ""}` : "none";
    const tileKey = (x, y) => [0, 1, 2, 3].map(l => $gameMap.tileId(x, y, l)).join(":");
    const errorScreen = () => { const e = document.getElementById("errorName"); return e && e.textContent ? e.textContent : ""; };
    const errorsNow = () => S.errors.slice(S.errStart);
    const saveInfoStamp = slot => { const i = DataManager.savefileInfo(slot); return i ? i.timestamp : null; };
    const readExpect = () => {
        if (S.expect) return S.expect;
        if (window.__smoke19aExpect) return window.__smoke19aExpect;
        try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; }
    };

    // Error capture and the focus rule: installed on the first step, put back by cleanup().
    function hook() {
        if (S.hooks) return;
        const onError = e => S.errors.push(`error: ${e.message} (${e.filename}:${e.lineno})`);
        const onRejection = e => S.errors.push(`unhandled rejection: ${e.reason && e.reason.message || e.reason}`);
        const consoleError = console.error;
        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);
        console.error = function(...a) { S.errors.push(a.map(x => (x && x.stack) || String(x)).join(" ")); return consoleError.apply(this, a); };
        // RMMZ pauses while its window has no focus, and DevTools takes it: keep the game running during the smoke.
        const isGameActive = SceneManager.isGameActive;
        SceneManager.isGameActive = () => true;
        S.hooks = { onError, onRejection, consoleError, isGameActive };
    }
    function unhook() {
        if (!S.hooks) return;
        window.removeEventListener("error", S.hooks.onError);
        window.removeEventListener("unhandledrejection", S.hooks.onRejection);
        console.error = S.hooks.consoleError;
        SceneManager.isGameActive = S.hooks.isGameActive;
        S.hooks = null;
    }
    // What the smoke changes in the game's own state, recorded once and put back by cleanup().
    function remember() {
        if (S.keep) return;
        S.keep = { follow: window.$colonyManager ? $colonyManager.cameraFollowUnit : null, savefileId: $gameSystem.savefileId(), view: L().view(),
            paused: window.UF && UF.Time ? UF.Time.paused : null };
    }

    // A cave floor at -1 with four rock cells south of it (rock on both sides and beyond), nearest the camera, no unit
    // near it: the fixture rule of the in-game suite "strata" (dig_tunnel).
    function findFixture(area) {
        const size = W().state.size;
        const cx = Math.round($gameMap.displayX() + $gameMap.screenTileX() / 2), cy = Math.round($gameMap.displayY() + $gameMap.screenTileY() / 2);
        const code = (x, y) => L().shapeCodeAt(area.x, area.y, x, y, -1);
        const rock = (x, y) => code(x, y) === L().SHAPES.solid && !L().cellAt(ref(area, x, y, -1)).constructed && !W().getObject(area.x, area.y, x, y, -1);
        const cave = (x, y) => !L().cellAt(ref(area, x, y, -1)).constructed && L().fluidStateAt(ref(area, x, y, -1)) === "FLUID_0_OF_5" && W().walkable(area.x, area.y, x, y, { z: -1 });
        const busy = (x, y) => W().units().some(u => (u.z || 0) === -1 && u.area.x === area.x && u.area.y === area.y && Math.abs(u.x - x) <= 4 && Math.abs(u.y - y) <= 5);
        let best = null, bestD = Infinity;
        for (let y = 12; y < size - 12; y++) {
            for (let x = 12; x < size - 12; x++) {
                const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
                if (d >= bestD || code(x, y) !== L().SHAPES.floor || !cave(x, y)) continue;
                let ok = true;
                for (let k = 1; k <= 4 && ok; k++) ok = rock(x, y + k) && rock(x - 1, y + k) && rock(x + 1, y + k);
                if (ok && rock(x, y + 5) && !busy(x, y + 2)) { best = { x, y }; bestD = d; }
            }
        }
        return best;
    }
    // A block of cells: strata, derived shape and object of each, on the listed levels.
    function block(area, x0, y0, w, h, zs, skip) {
        const cells = [];
        for (const z of zs) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
            if (skip && skip(x, y, z)) continue;
            cells.push({ x, y, z, key: strataKey(L().strataAt(ref(area, x, y, z))), code: L().shapeCodeAt(area.x, area.y, x, y, z), obj: W().getObject(area.x, area.y, x, y, z) || null });
        }
        return cells;
    }
    const typeName = id => { if (id === null || id === undefined) return "none"; const t = UF.Objects && UF.Objects.type ? UF.Objects.type(id) : null; return t && t.id ? `${t.id} (${id})` : String(id); };
    // What stands on a cell: its object, units, tile events.
    const blockers = (area, x, y, z) => {
        const o = W().getObject(area.x, area.y, x, y, z), us = W().units().filter(u => u.area.x === area.x && u.area.y === area.y && (u.z || 0) === z && u.x === x && u.y === y);
        const evs = L().view() === z ? $gameMap.eventsXy(x, y).filter(e => e.tileId && e.tileId() > 0).length : 0;
        return `object ${typeName(o)}, units ${us.map(u => u.name).join("/") || "none"}, tile events ${evs}`;
    };
    // Differences in a block: terrain (strata, derived shape) and ground objects are judged; objects below the ground are
    // listed apart (underground), because the natural objects of -1 and -2 come out of each fresh level build differently
    // on the pre-strata build too (2d5fc47, measured 2026-09-24: 30 cells of a 41 x 41 block of -1 after a load in a fresh
    // process, 0 on the ground), so they are no evidence about the strata either way.
    function blockDiff(area, cells) {
        const out = [], underground = [];
        for (const c of cells) {
            const key = strataKey(L().strataAt(ref(area, c.x, c.y, c.z))), code = L().shapeCodeAt(area.x, area.y, c.x, c.y, c.z), obj = W().getObject(area.x, area.y, c.x, c.y, c.z) || null;
            const terrain = `${key !== c.key ? " strata" : ""}${code !== c.code ? " shape" : ""}`, objText = obj !== c.obj ? ` object ${typeName(c.obj)} -> ${typeName(obj)}` : "";
            if (terrain || (objText && c.z >= 0)) out.push(`${c.z} (${c.x},${c.y})${objText}${terrain}`);
            else if (objText) underground.push(`${c.z} (${c.x},${c.y})${objText}`);
        }
        out.underground = underground;
        return out;
    }
    // The baselines regenerated from the seed now (not the in-memory cache): generateBaseline through checksum(z, seed, gen).
    const freshSums = st => LEVELS.map(z => (z === 0 ? L().checksum(0) : L().checksum(z, st.seed, st.levels[String(z)].gen)));

    // Steps. run() is start + prepare + dig + save; the driver calls them one by one to take screenshots in between.
    S.start = async function() {
        // A smoke save left by an earlier run on this page (or recorded in localStorage) is removed first when it is still
        // the file the smoke wrote; an older record is dropped.
        const stale = readExpect();
        if (stale && stale.slot) await removeOwnSlot(stale, "earlier smoke run");
        S.expect = null;
        window.__smoke19aExpect = null;
        try { localStorage.removeItem(STORE); } catch (e) { /* none */ }
        S.lines.length = 0;
        hook();
        S.errStart = S.errors.length;
        try { await until(() => mapReady(), 30000, "the map"); } catch (e) { /* reported below */ }
        remember();
        // The world stands still during the smoke (TimeSpeed pause): growth, grazing and walking would change the objects
        // and cells compared before the save and after the load. Frames still run.
        if (UF.Time && UF.Time.pause) UF.Time.pause();
        const st = W() && W().state;
        const ok0 = !!st && !!L() && typeof L().setStrata === "function" && typeof L().applyVolumeDamage === "function" && mapReady()
            && !!(UF.Floors && typeof UF.Floors.hasOpaqueOverburden === "function") && !errorScreen();
        say("startup", ok0 && st.strataSchemaVersion === L().STRATA_SCHEMA,
            `map scene up ${mapReady()}, error screen ${errorScreen() ? `"${errorScreen()}"` : "none"}, strata API ${!!(L() && L().setStrata)}, ` +
            `Floors.hasOpaqueOverburden ${!!(UF.Floors && UF.Floors.hasOpaqueOverburden)}, strataSchemaVersion ${st && st.strataSchemaVersion}, seed ${st && st.seed}`);
        if (!ok0) return null;
        const v0 = W().viewLevel(), area = { x: v0.x, y: v0.y }, size = st.size;
        if (L().view() !== 0) { L().setView(0); await until(() => L().view() === 0 && mapReady(), 20000, "the ground"); }
        const colonists = W().units().filter(u => u.data && u.data.kind === "colonist" && u.area.x === area.x && u.area.y === area.y);
        const offColonists = colonists.filter(u => !L().standableShape(ref(area, u.x, u.y, u.z || 0)));
        say("ground_z0", L().view() === 0 && colonists.length > 0 && offColonists.length === 0,
            `view ${L().label(L().view())}, area ${area.x},${area.y}; colonists ${colonists.length}, on cells not standable by their derived shape ${offColonists.length}`);
        // An ordinary generated part of the ground, 80 cells east of the camera (wrapped inside the area), no colonist near.
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        const home = { x: $gamePlayer.x, y: $gamePlayer.y };
        let far = null;
        for (let k = 0; k < 16 && !far; k++) {
            const x = 24 + ((home.x + 80 + k * 23) % (size - 48)), y = 24 + ((home.y + k * 37) % (size - 48));
            if (!colonists.some(u => Math.abs(u.x - x) < 20 && Math.abs(u.y - y) < 15)) far = { x, y };
        }
        far = far || { x: 24 + ((home.x + 80) % (size - 48)), y: home.y };
        $gamePlayer.locate(far.x, far.y);
        $gamePlayer.center(far.x, far.y);
        const f0 = Graphics.frameCount;
        await frames(30);
        const codes = {};
        for (let dy = -6; dy <= 6; dy++) for (let dx = -8; dx <= 8; dx++) { const c = L().shapeCodeAt(area.x, area.y, far.x + dx, far.y + dy, 0); codes[c] = (codes[c] || 0) + 1; }
        const readable = Object.keys(codes).every(c => Number(c) >= 1 && Number(c) <= 7);
        say("ordinary_area", mapReady() && readable && Graphics.frameCount > f0 && !errorScreen() && errorsNow().length === 0,
            `camera on the ground at (${far.x},${far.y}), ${Math.round(Math.hypot(far.x - home.x, far.y - home.y))} cells from (${home.x},${home.y}); ` +
            `shapes of the 17 x 13 cells on screen ${JSON.stringify(codes)} (1 solid, 2 floor, 4 ramp); frames advanced ${Graphics.frameCount - f0}; errors ${errorsNow().length}`);
        S.run_ = { area, home, far };
        return { area, home, far };
    };

    S.prepare = async function() {
        const r = S.run_;
        if (!r) { say("prepare", false, "start() first"); return null; }
        const st = W().state, area = r.area, size = st.size;
        $gamePlayer.locate(r.home.x, r.home.y);
        $gamePlayer.center(r.home.x, r.home.y);
        L().setView(-1);
        await until(() => L().view() === -1 && mapReady(), 30000, "level -1");
        const fx = findFixture(area);
        if (!say("fixture_minus1", !!fx, fx ? `cave floor (${fx.x},${fx.y}) at -1 with rock (${fx.x},${fx.y + 1}..${fx.y + 4}) south of it` : "no cave floor with a 4-cell rock face south of it in this area")) return null;
        const side = { x: fx.x + 1, y: fx.y + 2 };
        const dug = (x, y, z) => z === -1 && ((x === fx.x && y > fx.y && y <= fx.y + 4) || (x === side.x && y === side.y));
        const fx0 = Math.min(size - 13, Math.max(0, fx.x + (fx.x < size / 2 ? 40 : -52))), fy0 = Math.min(size - 13, Math.max(0, fx.y - 6));
        r.fx = fx;
        r.side = side;
        r.far = { x0: fx0, y0: fy0, cells: block(area, fx0, fy0, 12, 12, [-1, 0]) };
        r.near = block(area, fx.x - 6, fx.y - 6, 13, 17, [-1, 0], dug);
        r.sumsFresh = freshSums(st);
        r.sumsSaved = LEVELS.map(z => st.levels[String(z)].checksum);
        r.cells = [1, 2, 3, 4].map(k => ref(area, fx.x, fx.y + k, -1));
        $gamePlayer.locate(fx.x, fx.y + 2);
        $gamePlayer.center(fx.x, fx.y + 2);
        await frames(20);
        r.before = r.cells.map(c => ({ strata: L().strataAt(c), walk: W().walkable(area.x, area.y, c.x, c.y, { z: -1 }), shape: L().shapeAt(c), tiles: tileKey(c.x, c.y) }));
        return { fx, side };
    };

    S.dig = async function(opts = {}) {
        const r = S.run_;
        if (!r || !r.fx) { say("dig", false, "prepare() first"); return null; }
        const area = r.area, fx = r.fx, dmg = opts.damage !== undefined ? opts.damage : 100000;
        // S1..S4 of the four rock cells (a tunnel whose floor is their own S0), then 5 impact on S2 of the rock east of the
        // second cell (HP drops, the stratum stays).
        const sum = L().applyVolumeDamage(area, fx.x, fx.y + 1, -1, 1, fx.x, fx.y + 4, -1, 4, dmg, "dig", { source: "smoke19a" });
        const hit = L().applyStrataDamage(area, r.side.x, r.side.y, -1, 2, opts.damage !== undefined ? opts.damage : 5, "impact", { source: "smoke19a" });
        await frames(20);
        r.after = r.cells.map(c => ({ strata: L().strataAt(c), walk: W().walkable(area.x, area.y, c.x, c.y, { z: -1 }), shape: L().shapeAt(c),
            pass: $gameMap.isPassable(c.x, c.y, 2), tiles: tileKey(c.x, c.y) }));
        const path = W().findPath(area, fx.x, fx.y, fx.x, fx.y + 4, { z: -1 });
        const pathOk = !!path && path.length === 4 && path[3].x === fx.x && path[3].y === fx.y + 4;
        say("damage_geometry", sum.ok && sum.strataDestroyed === 16 && r.before.every(b => b.shape === "solid" && !b.walk)
            && r.after.every(a => a.shape === "floor" && a.strata.fill === 1 && a.strata.changed),
            `applyVolumeDamage destroyed ${sum.strataDestroyed} strata in ${sum.cells} cells (want 16 in 4); before ${r.before.map(b => b.shape).join("/")}, after ${r.after.map(a => `${a.shape} [${a.strata.materials.join("/")}]`).join(", ")}`);
        say("map_repainted", r.after.every((a, i) => a.tiles !== r.before[i].tiles),
            `tile ids of the 4 cells (layers 0..3) ${r.before.map(b => b.tiles).join(" ")} -> ${r.after.map(a => a.tiles).join(" ")}`);
        say("walkability", r.after.every(a => a.walk && a.pass) && pathOk,
            `walkable ${r.after.map(a => a.walk).join("/")}, map passable ${r.after.map(a => a.pass).join("/")}, path (${fx.x},${fx.y}) -> (${fx.x},${fx.y + 4}) ${path ? `${path.length} steps` : "none"} (want 4)`);
        const sideNow = L().strataAt(ref(area, r.side.x, r.side.y, -1));
        say("partial_hp", hit.ok && hit.hit && !hit.destroyed && hit.hpAfter > 0 && hit.hpAfter < 255 && sideNow.hp[2] === hit.hpAfter && sideNow.materials[2] !== "air",
            `impact on S2 of (${r.side.x},${r.side.y}) at -1 (${hit.material}): HP ${hit.hpBefore} -> ${hit.hpAfter}, stratum still ${sideNow.materials[2]}`);
        r.sideKey = strataKey(sideNow);
        r.sideHp = sideNow.hp[2];
        return { sum, hit };
    };

    S.save = async function() {
        const r = S.run_;
        if (!r || !r.after) { say("save", false, "dig() first"); return null; }
        const st = W().state, max = DataManager.maxSavefiles();
        let slot = 0;
        for (let id = max - 1; id >= 1; id--) if (!DataManager.savefileExists(id)) { slot = id; break; }
        if (!slot) { say("save", false, `no free save slot among 1..${max - 1}: free one (the smoke never writes over a save)`); return null; }
        let saveError = null;
        const prevSlot = $gameSystem.savefileId();
        try {
            $gameSystem.setSavefileId(slot);
            $gameSystem.onBeforeSave();
            await DataManager.saveGame(slot);
        } catch (e) { saveError = e && e.message || String(e); }
        $gameSystem.setSavefileId(prevSlot);   // the Save screen keeps pointing at the game's own slot
        const stamp = saveInfoStamp(slot);
        const records = LEVELS.reduce((n, z) => n + Object.values(st.levels[String(z)].strata || {}).reduce((m, c) => m + Object.keys(c).length, 0), 0);
        const ok = say("save", !saveError && DataManager.savefileExists(slot) && stamp !== null,
            `slot ${slot} (was free): ${saveError ? `error ${saveError}` : "written"}, global info timestamp ${stamp}; saved strata records ${records}`);
        if (!ok) return null;
        S.expect = { slot, stamp, area: r.area, fx: r.fx, side: r.side, sideKey: r.sideKey, sideHp: r.sideHp, seed: st.seed,
            cells: r.after.map((a, i) => ({ key: strataKey(a.strata), tiles: a.tiles, obj: W().getObject(r.area.x, r.area.y, r.cells[i].x, r.cells[i].y, -1) || null })), far: r.far, near: r.near, sumsFresh: r.sumsFresh, sumsSaved: r.sumsSaved,
            page: performance.timeOrigin };
        window.__smoke19aExpect = S.expect;
        try { localStorage.setItem(STORE, JSON.stringify(S.expect)); } catch (e) { /* the window keeps it */ }
        return { slot, stamp };
    };

    S.run = async function() {
        if (!(await S.start())) return S.report();
        if (!(await S.prepare())) return S.report();
        await S.dig();
        await S.save();
        console.log(`${LOG} run done: look at the tunnel at -1 (centre of the screen), then await __smoke19a.reload(), then await __smoke19a.verify()`);
        return S.report();
    };

    // The slot loaded through the game's own Load screen (Scene_Load.executeLoad: loadGame, reloadMapIfUpdated,
    // goto(Scene_Map), onAfterLoad when the load screen ends).
    S.reload = async function() {
        const e = readExpect();
        if (!e) { say("reload", false, "run() first"); return S.report(); }
        hook();
        if (saveInfoStamp(e.slot) !== e.stamp) { say("reload", false, `slot ${e.slot} is not the smoke's save any more (timestamp ${saveInfoStamp(e.slot)}, saved ${e.stamp})`); return S.report(); }
        const oldScene = SceneManager._scene;
        pauseOnNextLoad();
        let loadError = null;
        try {
            SceneManager.push(Scene_Load);
            await until(() => SceneManager._scene instanceof Scene_Load && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging(), 20000, "the Load screen");
            SceneManager._scene.executeLoad(e.slot);
            await until(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene !== oldScene && mapReady(), 60000, "the loaded game's map");
            await frames(30);
            S.loadedScene = SceneManager._scene;
        } catch (err) { loadError = err && err.message || String(err); }
        say("reload", !loadError && mapReady() && SceneManager._scene !== oldScene && !errorScreen(),
            `slot ${e.slot} loaded through Scene_Load: ${loadError ? `error ${loadError}` : `a new map scene (map ${$gameMap.mapId()}, view ${L().label(L().view())})`}, error screen ${errorScreen() ? `"${errorScreen()}"` : "none"}`);
        return S.report();
    };

    S.verify = async function() {
        const e = readExpect();
        if (!e) { say("verify", false, "run() first (or paste the expectation into window.__smoke19aExpect)"); return S.report(); }
        hook();
        remember();
        if (UF.Time && UF.Time.pause) UF.Time.pause();
        await until(() => mapReady(), 60000, "the map");
        const st = W().state, area = e.area, cold = e.page !== performance.timeOrigin;
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        if (L().view() !== -1) { L().setView(-1, { center: { x: e.fx.x, y: e.fx.y + 2 } }); await until(() => L().view() === -1 && mapReady(), 30000, "level -1"); }
        $gamePlayer.locate(e.fx.x, e.fx.y + 2);
        $gamePlayer.center(e.fx.x, e.fx.y + 2);
        await frames(20);
        const cells = [1, 2, 3, 4].map(k => ref(area, e.fx.x, e.fx.y + k, -1));
        const now = cells.map(c => ({ key: strataKey(L().strataAt(c)), tiles: tileKey(c.x, c.y), shape: L().shapeAt(c), walk: W().walkable(area.x, area.y, c.x, c.y, { z: -1 }), pass: $gameMap.isPassable(c.x, c.y, 2) }));
        const sameStrata = now.every((n, i) => n.key === e.cells[i].key), sameTiles = now.every((n, i) => n.tiles === e.cells[i].tiles);
        say("persisted_strata", st.seed === e.seed && st.strataSchemaVersion === L().STRATA_SCHEMA && sameStrata && sameTiles && now.every(n => n.shape === "floor"),
            `${cold ? "fresh process" : "same page"}; seed ${st.seed} (saved ${e.seed}); tunnel cells ${now.map(n => n.shape).join("/")}, walkable ${now.map(n => n.walk).join("/")}, ` +
            `map passable ${now.map(n => n.pass).join("/")}, strata equal to the saved ones ${sameStrata}, tiles equal to after the dig ${sameTiles}` +
            now.map((n, i) => (n.walk && n.pass ? "" : `; (${cells[i].x},${cells[i].y}) blocked by: ${blockers(area, cells[i].x, cells[i].y, -1)}`)).join(""));
        // Walkable after the load. A cell blocked only by a natural object that was not there when the game was saved is
        // KNOWN: fresh level builds put natural objects on dug floors on the pre-strata build too (2d5fc47, measured
        // 2026-09-24: spore_reeds on a cell dug with setShape, after a load in a fresh process). Anything else is a FAIL.
        const blocked = now.map((n, i) => ({ i, n })).filter(b => !(b.n.walk && b.n.pass));
        const newObject = b => { const o = W().getObject(area.x, area.y, cells[b.i].x, cells[b.i].y, -1) || null; return o !== null && o !== (e.cells[b.i].obj || null); };
        if (blocked.length && blocked.every(newObject)) known("objects_on_dug_floor", blocked.map(b => `(${cells[b.i].x},${cells[b.i].y}) ${blockers(area, cells[b.i].x, cells[b.i].y, -1)}`).join("; ") + ": a natural object not in the save, placed by the fresh level build; the strata are the saved ones (persisted_strata)");
        else say("tunnel_walkable", blocked.length === 0, blocked.length ? blocked.map(b => `(${cells[b.i].x},${cells[b.i].y}) walkable ${b.n.walk}, passable ${b.n.pass}: ${blockers(area, cells[b.i].x, cells[b.i].y, -1)}`).join("; ") : "the 4 dug cells are walkable and passable after the load");
        const side = L().strataAt(ref(area, e.side.x, e.side.y, -1));
        say("persisted_hp", side.hp[2] === e.sideHp && strataKey(side) === e.sideKey,
            `(${e.side.x},${e.side.y}) at -1: S2 HP ${side.hp[2]} (saved ${e.sideHp}), materials [${side.materials.join("/")}]`);
        const nearDiff = blockDiff(area, e.near);
        say("nearby_untouched", nearDiff.length === 0,
            `${e.near.length} cells of -1 and the ground round the tunnel (13 x 17, the dug cells left out): strata, shape and ground objects; ${nearDiff.length} differ${nearDiff.length ? ` (${nearDiff.slice(0, 4).join("; ")})` : ""}`);
        const farDiff = blockDiff(area, e.far.cells), fresh = freshSums(st), saved = LEVELS.map(z => st.levels[String(z)].checksum), mismatch = L().verifyLevels(st);
        const freshOk = fresh.every((s, i) => s === e.sumsFresh[i]), savedOk = saved.every((s, i) => s === e.sumsSaved[i]);
        say("untouched_deterministic", farDiff.length === 0 && freshOk && savedOk && mismatch.length === 0,
            `${cold ? "fresh process: every baseline regenerated from the seed; " : ""}control block ${e.far.x0},${e.far.y0} (12 x 12 cells of -1 and the ground): ${farDiff.length} of ${e.far.cells.length} differ${farDiff.length ? ` (${farDiff.slice(0, 3).join("; ")})` : ""}; ` +
            `baselines regenerated from seed ${st.seed} now ${freshOk ? "equal" : `DIFFERENT (${fresh.join(" ")} vs ${e.sumsFresh.join(" ")})`}, saved checksums ${savedOk ? "equal" : "DIFFERENT"}, verifyLevels mismatches ${mismatch.length}`);
        const under = [...nearDiff.underground, ...farDiff.underground];
        if (under.length) known("objects_underground", `${under.length} cells of -1 hold another natural object than before the save (${under.slice(0, 3).join("; ")}): the pre-strata build does the same (2d5fc47, measured 2026-09-24: natural objects of -1 differ after a load, ground objects do not); not a strata result`);
        else say("objects_underground", true, "the objects of -1 in both blocks are the same as before the save");
        // Back to the ground and to the tunnel: the level switch works on the loaded game.
        L().setView(0);
        let groundOk = true;
        try { await until(() => L().view() === 0 && mapReady(), 30000, "the ground"); await frames(20); } catch (err) { groundOk = false; }
        const z0 = groundOk && L().shapeCodeAt(area.x, area.y, $gamePlayer.x, $gamePlayer.y, 0);
        L().setView(-1, { center: { x: e.fx.x, y: e.fx.y + 2 } });
        try { await until(() => L().view() === -1 && mapReady(), 30000, "level -1 again"); await frames(20); } catch (err) { groundOk = false; }
        $gamePlayer.center(e.fx.x, e.fx.y + 2);
        const f0 = Graphics.frameCount;
        await sleep(600);
        say("game_running", groundOk && z0 >= 1 && Graphics.frameCount > f0 + 10 && !errorScreen(),
            `view switched Z-1 -> Z0 (shape under the camera ${z0}) -> Z-1 after the load ${groundOk}; frames in 0.6 s ${Graphics.frameCount - f0}; error screen ${errorScreen() ? `"${errorScreen()}"` : "none"}`);
        const errs = errorsNow();
        say("no_console_errors", errs.length === 0, errs.length ? `${errs.length}: ${errs.slice(0, 3).join(" | ")}` : "none since this run started");
        return S.report();
    };

    S.report = function() {
        const failed = S.lines.filter(l => l.startsWith("FAIL")).length, knownN = S.lines.filter(l => l.startsWith("KNOWN")).length;
        console.log(`${LOG} REPORT\n${S.lines.join("\n")}\n${LOG} ${S.lines.length - failed - knownN} passed, ${failed} failed, ${knownN} known (measured before 19A too)`);
        return { passed: S.lines.length - failed - knownN, failed, known: knownN, lines: S.lines.slice(), expect: S.expect || null };
    };

    // DataManager.createGameObjects (inside loadGame) sets TimeSpeed running; pause once the save is read, before the loaded
    // map updates.
    function pauseOnNextLoad() {
        const extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) {
            DataManager.extractSaveContents = extract;
            extract.call(this, contents);
            if (window.UF && UF.Time && UF.Time.pause) UF.Time.pause();
        };
    }
    S.pauseOnNextLoad = pauseOnNextLoad;

    // Delete a smoke save only when the slot's global-info timestamp is still the one the smoke recorded.
    async function removeOwnSlot(e, why) {
        const stamp = saveInfoStamp(e.slot);
        if (stamp === null || stamp !== e.stamp) {
            console.log(`${LOG} ${why}: slot ${e.slot} left alone (${stamp === null ? "no save there" : `timestamp ${stamp} is not the smoke's ${e.stamp}`})`);
            return false;
        }
        await StorageManager.remove(DataManager.makeSavename(e.slot));
        delete DataManager._globalInfo[e.slot];
        DataManager.saveGlobalInfo();
        console.log(`${LOG} ${why}: removed the smoke's save slot ${e.slot}`);
        return true;
    }
    S.cleanup = async function() {
        const e = readExpect();
        const removed = e && e.slot ? await removeOwnSlot(e, "cleanup") : false;
        S.expect = null;
        window.__smoke19aExpect = null;
        try { localStorage.removeItem(STORE); } catch (err) { /* none */ }
        if (S.keep) {
            if (window.$colonyManager) $colonyManager.cameraFollowUnit = S.keep.follow;
            if ($gameSystem.savefileId() !== S.keep.savefileId) $gameSystem.setSavefileId(S.keep.savefileId);
            if (L().view() !== S.keep.view) L().setView(S.keep.view);
            if (S.keep.paused === false && UF.Time && UF.Time.resume) UF.Time.resume();
            S.keep = null;
        }
        unhook();
        console.log(`${LOG} cleanup done: console.error, the error listeners and the focus rule put back`);
        return removed;
    };

    console.log(`${LOG} ready (v${VERSION}): await __smoke19a.run(), then await __smoke19a.reload(), then await __smoke19a.verify(), then await __smoke19a.cleanup()`);
})();
