/*
 * tools/smoke_19a_playtest.js
 *
 * DEUS-TSK-FABLE-19A native smoke gate (owner direction 2026-09-24, "FABLE-19A OWNER REVIEW / INTEGRATION DECISIONS"
 * section 5). A console script for an RMMZ Playtest: nothing here is loaded by the game.
 *
 *   1. RPG Maker MZ: open the project, F5, New Game; wait for the map.
 *   2. Look round the ground (Z0) and one ordinary area with the mouse or keys. No error screen; F8 -> Console shows no
 *      red errors (the script below only counts errors from the moment it is pasted).
 *   3. F8 -> Console: paste this whole file, Enter.
 *   4. await __smoke19a.run()      -> Z0 and Z-1 checked, a tunnel dug at -1 with applyVolumeDamage (the view goes to
 *                                     -1 and centres on it: look at it), one stratum damaged (HP), saved to a free slot.
 *   5. await __smoke19a.reload()   -> that slot loaded the way the Load screen does. (Or load it yourself from the
 *                                     title's Continue / Load, then go on.)
 *   6. await __smoke19a.verify()   -> the dug strata and the HP persisted, the untouched control block and every
 *                                     level's baseline checksum are unchanged, no console errors since step 3.
 *   7. __smoke19a.report()         -> every PASS / FAIL line again. await __smoke19a.cleanup() deletes the save slot
 *                                     the smoke made (it never touches a slot that already existed).
 *
 * Each step prints "[smoke19a] PASS name - detail" or "[smoke19a] FAIL name - detail". The gate passes when every line
 * is PASS and the tunnel is visible at -1 after step 4 and after step 5.
 */
(() => {
    "use strict";
    const S = window.__smoke19a && window.__smoke19a.version === 1 ? window.__smoke19a : { version: 1, lines: [], errors: [], expect: null };
    window.__smoke19a = S;
    const LOG = "[smoke19a]";
    const L = () => window.UF && UF.Levels, W = () => window.UF && UF.World;
    const LEVELS = [-2, -1, 0, 1, 2];
    const say = (ok, name, detail) => {
        const line = `${ok ? "PASS" : "FAIL"} ${name} - ${detail}`;
        S.lines.push(line);
        (ok ? console.log : console.warn)(`${LOG} ${line}`);
        return !!ok;
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
    const mapReady = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring()
        && !(L().switching && L().switching());

    // Console errors and uncaught errors from the moment the script is pasted.
    if (!S.hooked) {
        S.hooked = true;
        window.addEventListener("error", e => S.errors.push(`error: ${e.message} (${e.filename}:${e.lineno})`));
        window.addEventListener("unhandledrejection", e => S.errors.push(`unhandled rejection: ${e.reason && e.reason.message || e.reason}`));
        const ce = console.error;
        console.error = function(...a) { S.errors.push(a.map(x => (x && x.stack) || String(x)).join(" ")); return ce.apply(this, a); };
    }

    const ref = (area, x, y, z) => ({ area: { x: area.x, y: area.y }, x, y, z });
    const strataKey = s => s ? `${s.bytes.join(",")}|${s.hp.join(",")}|${s.connector || ""}` : "none";

    // A cave floor at -1 with four rock cells south of it (rock on both sides and beyond), nearest the camera, no unit
    // near it: the same fixture rule as the in-game suite "strata" (dig_tunnel).
    function findFixture(area) {
        const st = W().state, size = st.size;
        const cx = Math.round($gameMap.displayX() + $gameMap.screenTileX() / 2), cy = Math.round($gameMap.displayY() + $gameMap.screenTileY() / 2);
        const code = (x, y) => L().shapeCodeAt(area.x, area.y, x, y, -1);
        const rock = (x, y) => code(x, y) === L().SHAPES.solid && !L().cellAt(ref(area, x, y, -1)).constructed && !W().getObject(area.x, area.y, x, y, -1);
        const cave = (x, y) => code(x, y) === L().SHAPES.floor && !L().cellAt(ref(area, x, y, -1)).constructed
            && L().fluidStateAt(ref(area, x, y, -1)) === "FLUID_0_OF_5" && W().walkable(area.x, area.y, x, y, { z: -1 });
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
    // The control block: 12 x 12 cells of -1 and the ground, 40 cells from the fixture, recorded before anything changes.
    function controlBlock(area, fx) {
        const size = W().state.size, x0 = Math.min(size - 13, Math.max(0, fx.x + (fx.x < size / 2 ? 40 : -52))), y0 = Math.min(size - 13, Math.max(0, fx.y - 6));
        const cells = [];
        for (const z of [-1, 0]) for (let y = y0; y < y0 + 12; y++) for (let x = x0; x < x0 + 12; x++) {
            cells.push({ x, y, z, key: strataKey(L().strataAt(ref(area, x, y, z))), code: L().shapeCodeAt(area.x, area.y, x, y, z) });
        }
        return { x0, y0, cells };
    }

    S.run = async function(opts = {}) {
        S.lines.length = 0;
        const st = W() && W().state;
        const ok0 = !!st && !!L() && typeof L().setStrata === "function" && typeof L().applyVolumeDamage === "function" && mapReady()
            && !!(UF.Floors && typeof UF.Floors.hasOpaqueOverburden === "function");
        // Errors before the paste (an error screen, red lines in F8) are the viewer's to see; this script counts from the paste.
        say("startup", ok0 && st.strataSchemaVersion === L().STRATA_SCHEMA,
            `map scene up ${mapReady()}, strata API ${!!(L() && L().setStrata)}, Floors.hasOpaqueOverburden ${!!(UF.Floors && UF.Floors.hasOpaqueOverburden)}, ` +
            `strataSchemaVersion ${st && st.strataSchemaVersion}, seed ${st && st.seed}`);
        if (!ok0) return S.report();
        const v0 = W().viewLevel(), area = { x: v0.x, y: v0.y };
        // Z0: the cell under the camera and the colonists.
        if (L().view() !== 0) { L().setView(0); await until(() => L().view() === 0 && mapReady(), 20000, "the ground"); }
        const colonists = W().units().filter(u => u.data && u.data.kind === "colonist" && u.area.x === area.x && u.area.y === area.y);
        const offColonists = colonists.filter(u => !L().standableShape(ref(area, u.x, u.y, u.z || 0)));
        say("ground_z0", L().view() === 0 && colonists.length > 0 && offColonists.length === 0,
            `view ${L().label(L().view())}, area ${area.x},${area.y}; colonists ${colonists.length}, on cells not standable by their derived shape ${offColonists.length}`);
        const checksums = LEVELS.map(z => L().checksum(z));
        const savedSums = LEVELS.map(z => st.levels[String(z)].checksum);
        // Z-1
        L().setView(-1);
        await until(() => L().view() === -1 && mapReady(), 30000, "level -1");
        const fx = findFixture(area);
        if (!say("fixture_minus1", !!fx, fx ? `cave floor (${fx.x},${fx.y}) at -1 with rock (${fx.x},${fx.y + 1}..${fx.y + 4}) south of it` : "no cave floor with a 4-cell rock face south of it in this area")) return S.report();
        const control = controlBlock(area, fx);
        const cells = [1, 2, 3, 4].map(k => ref(area, fx.x, fx.y + k, -1));
        const before = cells.map(r => ({ strata: L().strataAt(r), walk: W().walkable(area.x, area.y, r.x, r.y, { z: -1 }), shape: L().shapeAt(r) }));
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        $gamePlayer.center(fx.x, fx.y + 2);
        await sleep(300);
        // The damage: S1..S4 of the four rock cells (a tunnel whose floor is their own S0), then 5 impact on S2 of the rock
        // east of the second cell (partial: HP drops, the stratum stays).
        const sum = L().applyVolumeDamage(area, fx.x, fx.y + 1, -1, 1, fx.x, fx.y + 4, -1, 4, 100000, "dig", { source: "smoke19a" });
        const side = ref(area, fx.x + 1, fx.y + 2, -1);
        const hit = L().applyStrataDamage(area, side.x, side.y, -1, 2, 5, "impact", { source: "smoke19a" });
        await sleep(500);
        const after = cells.map(r => ({ strata: L().strataAt(r), walk: W().walkable(area.x, area.y, r.x, r.y, { z: -1 }), shape: L().shapeAt(r),
            pass: $gameMap.isPassable(r.x, r.y, 2) }));
        const path = W().findPath(area, fx.x, fx.y, fx.x, fx.y + 4, { z: -1 });
        const pathOk = !!path && path.length === 4 && path[3].x === fx.x && path[3].y === fx.y + 4;
        say("damage_geometry", sum.ok && sum.strataDestroyed === 16 && before.every(b => b.shape === "solid" && !b.walk)
            && after.every(a => a.shape === "floor" && a.strata.fill === 1 && a.strata.changed),
            `applyVolumeDamage destroyed ${sum.strataDestroyed} strata in ${sum.cells} cells (want 16 in 4); before ${before.map(b => b.shape).join("/")}, after ${after.map(a => `${a.shape} [${a.strata.materials.join("/")}]`).join(", ")}`);
        say("walkability", after.every(a => a.walk && a.pass) && pathOk,
            `walkable ${after.map(a => a.walk).join("/")}, map passable ${after.map(a => a.pass).join("/")}, path (${fx.x},${fx.y}) -> (${fx.x},${fx.y + 4}) ${path ? `${path.length} steps` : "none"} (want 4)`);
        const sideNow = L().strataAt(side);
        say("partial_hp", hit.ok && hit.hit && !hit.destroyed && hit.hpAfter > 0 && hit.hpAfter < 255 && sideNow.hp[2] === hit.hpAfter && sideNow.materials[2] !== "air",
            `5 impact on S2 of (${side.x},${side.y}) at -1 (${hit.material}): HP ${hit.hpBefore} -> ${hit.hpAfter}, stratum still ${sideNow.materials[2]}`);
        // Save to a free slot the way the Save screen does.
        const max = DataManager.maxSavefiles();
        let slot = opts.slot || 0;
        if (!slot) for (let id = max - 1; id >= 1; id--) if (!DataManager.savefileExists(id)) { slot = id; break; }
        if (!slot || (!opts.slot && DataManager.savefileExists(slot))) { say("save", false, `no free save slot among 1..${max - 1}; pass { slot } to choose one`); return S.report(); }
        const slotWasFree = !DataManager.savefileExists(slot);
        let saveError = null;
        try {
            $gameSystem.setSavefileId(slot);
            $gameSystem.onBeforeSave();
            await DataManager.saveGame(slot);
        } catch (e) { saveError = e && e.message || String(e); }
        const records = LEVELS.reduce((n, z) => n + Object.values(st.levels[String(z)].strata || {}).reduce((m, c) => m + Object.keys(c).length, 0), 0);
        say("save", !saveError && DataManager.savefileExists(slot), `slot ${slot}${slotWasFree ? " (was free)" : " (chosen, was in use)"}: ${saveError ? `error ${saveError}` : "written"}; saved strata records ${records}`);
        S.expect = { slot, slotWasFree, area, fx, seed: st.seed, checksums, savedSums, control,
            cells: after.map(a => strataKey(a.strata)), side: { x: side.x, y: side.y, hp: sideNow.hp[2], key: strataKey(sideNow) } };
        try { localStorage.setItem("smoke19a", JSON.stringify(S.expect)); } catch (e) { /* the window keeps it anyway */ }
        console.log(`${LOG} run done: look at the tunnel at -1 (centre of the screen), then await __smoke19a.reload() or load slot ${slot} yourself, then await __smoke19a.verify()`);
        return S.report();
    };

    S.reload = async function() {
        const e = S.expect || JSON.parse(localStorage.getItem("smoke19a") || "null");
        if (!e) { say("reload", false, "run() first"); return S.report(); }
        let loadError = null;
        try {
            await DataManager.loadGame(e.slot);
            if ($gameSystem.versionId() !== $dataSystem.versionId) {
                $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y, $gamePlayer.direction(), 0);
                $gamePlayer.requestMapReload();
            }
            SceneManager.goto(Scene_Map);
            $gameSystem.onAfterLoad();
            await until(() => mapReady(), 60000, "the loaded game's map");
        } catch (err) { loadError = err && err.message || String(err); }
        say("reload", !loadError && mapReady(), `slot ${e.slot} loaded as the Load screen does: ${loadError ? `error ${loadError}` : `map ${$gameMap.mapId()}, view ${L().label(L().view())}`}`);
        return S.report();
    };

    S.verify = async function() {
        const e = S.expect || JSON.parse(localStorage.getItem("smoke19a") || "null");
        if (!e) { say("verify", false, "run() first"); return S.report(); }
        await until(() => mapReady(), 60000, "the map");
        const st = W().state, area = e.area;
        if (L().view() !== -1) { L().setView(-1, { center: { x: e.fx.x, y: e.fx.y + 2 } }); await until(() => L().view() === -1 && mapReady(), 30000, "level -1"); }
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        $gamePlayer.center(e.fx.x, e.fx.y + 2);
        const cells = [1, 2, 3, 4].map(k => ref(area, e.fx.x, e.fx.y + k, -1));
        const now = cells.map(r => strataKey(L().strataAt(r)));
        const shapes = cells.map(r => L().shapeAt(r)), walk = cells.map(r => W().walkable(area.x, area.y, r.x, r.y, { z: -1 }));
        say("persisted_strata", st.seed === e.seed && st.strataSchemaVersion === L().STRATA_SCHEMA && now.every((k, i) => k === e.cells[i]) && shapes.every(s => s === "floor") && walk.every(Boolean),
            `seed ${st.seed} (saved ${e.seed}); tunnel cells after the reload ${shapes.join("/")}, walkable ${walk.join("/")}, strata equal to the saved ones ${now.every((k, i) => k === e.cells[i])}${now.every((k, i) => k === e.cells[i]) ? "" : ` (now ${now.join(" ; ")})`}`);
        const side = L().strataAt(ref(area, e.side.x, e.side.y, -1));
        say("persisted_hp", side.hp[2] === e.side.hp && strataKey(side) === e.side.key,
            `(${e.side.x},${e.side.y}) at -1: S2 HP ${side.hp[2]} (saved ${e.side.hp}), materials [${side.materials.join("/")}]`);
        let diff = 0;
        const ex = [];
        for (const c of e.control.cells) {
            const k = strataKey(L().strataAt(ref(area, c.x, c.y, c.z))), code = L().shapeCodeAt(area.x, area.y, c.x, c.y, c.z);
            if (k !== c.key || code !== c.code) { diff++; if (ex.length < 3) ex.push(`${c.z} (${c.x},${c.y})`); }
        }
        const sums = LEVELS.map(z => L().checksum(z)), savedSums = LEVELS.map(z => st.levels[String(z)].checksum), mismatch = L().verifyLevels(st);
        say("untouched_deterministic", diff === 0 && sums.every((s, i) => s === e.checksums[i]) && savedSums.every((s, i) => s === e.savedSums[i]) && mismatch.length === 0,
            `control block ${e.control.x0},${e.control.y0} (12 x 12 cells of -1 and the ground): ${diff} of ${e.control.cells.length} cells differ${ex.length ? ` (${ex.join("; ")})` : ""}; ` +
            `baseline checksums ${sums.every((s, i) => s === e.checksums[i]) ? "equal" : "DIFFERENT"} (${sums.join(" ")}), saved checksums ${savedSums.every((s, i) => s === e.savedSums[i]) ? "equal" : "DIFFERENT"}, verifyLevels mismatches ${mismatch.length}`);
        say("no_console_errors", S.errors.length === 0, S.errors.length ? `${S.errors.length}: ${S.errors.slice(0, 3).join(" | ")}` : "none since the script was pasted");
        return S.report();
    };

    S.report = function() {
        const failed = S.lines.filter(l => l.startsWith("FAIL")).length;
        const text = `${S.lines.join("\n")}\n${LOG} ${S.lines.length - failed} passed, ${failed} failed`;
        console.log(`${LOG} REPORT\n${text}`);
        return { passed: S.lines.length - failed, failed, lines: S.lines.slice() };
    };

    S.cleanup = async function() {
        const e = S.expect || JSON.parse(localStorage.getItem("smoke19a") || "null");
        if (!e || !e.slotWasFree) { console.log(`${LOG} cleanup: nothing to remove (${e ? `slot ${e.slot} existed before the smoke` : "no run"})`); return false; }
        await StorageManager.remove(DataManager.makeSavename(e.slot));
        delete DataManager._globalInfo[e.slot];
        DataManager.saveGlobalInfo();
        try { localStorage.removeItem("smoke19a"); } catch (err) { /* ignore */ }
        console.log(`${LOG} cleanup: removed save slot ${e.slot}`);
        return true;
    };

    console.log(`${LOG} ready: await __smoke19a.run(), then await __smoke19a.reload(), then await __smoke19a.verify()`);
})();
