#!/usr/bin/env node
"use strict";

/**
 * tools/test_layer_switch_inplace.js
 *
 * SIM.00.00 (Lane N): changing the viewed Z level is a view change, not a map transfer. The tilemap data and layer
 * bindings are swapped in place, the Scene_Map and its Spriteset stay, the simulation keeps running, and the levels a
 * switch can land on (z±1, z±2) are prewarmed so a switch never builds a level synchronously.
 *
 * Runs the real game in NW.js on a snapshot copy of game/ (robocopy to %TEMP%; nothing under game/ is written). The
 * snapshot gets one extra, test-only plugin (DEUS_TestLayerSwitch.js, registered after DEUS_Test) holding the suite
 * "layer_switch_inplace", and a fixed world seed (DEUS_World parameter Seed, default 18) so runs are comparable.
 * The suite puts a TEST unit on every level near the view, waits for the prewarm, then switches 0 -> +1 -> +2 -> 0 ->
 * -1 -> 0 from the ground twice: round 1 with the fog as in play (disabled), round 2 with the fog forced on. Rounds 3 and
 * 4 repeat the sequence as the bench scenario (fog as in play). Round 5 switches to -1 and +1, then the game is saved and
 * loaded, and round 6 switches once more. Every switch is written to test_output/layer_switch_perf.json (lastSwitch, the
 * World's swap and rebind numbers, UF.World.buildArea calls, the slowest SceneManager.updateMain in its window).
 *
 * Checks (each prints PASS or FAIL; each is shown failing by a mutant below). Checks 1-5 judge rounds 1 and 2:
 *   same_scene_and_spriteset        the switch sequence creates no Scene_Map and no Spriteset_Map (constructors counted)
 *                                   and the scene and its spriteset are the same objects before and after every switch
 *   ticks_never_skipped             every SceneManager.updateMain from each switch request to 2 frames after it completed
 *                                   advanced UF.Time.ticks() and UF.World._frame by exactly 1 (speed 1x, not paused), and
 *                                   both counts moved on across every switch
 *   no_sync_build_after_prewarm     once the prewarm reports no cold ring level, no UF.World.buildArea call happens from a
 *                                   switch request to 2 frames after it completed (buildArea wrapped; covers peekArea
 *                                   misses and the swap's own fallback build)
 *   switch_within_one_frame         after every switch UF.Levels.stats().lastSwitch is new, for this level, in place,
 *                                   frames <= 1 and renderFrames <= 1, and its ms is a finite number (reported)
 *   new_level_shown_at_once         in the first frame the switch is complete: the map id, $dataMap, tilemap data and
 *                                   tileset are the new level's; the view (player) keeps its cell, its sprite and the
 *                                   camera; every unit of the level (a TEST unit on each level included) has an event and a
 *                                   sprite, and no sprite of another level's event is left; the objects and items layers,
 *                                   the depth planes and the level plate are on the new level; the fog (forced on for the
 *                                   test: it is disabled in play since 2026-09-22) shows this level's explored cells and not
 *                                   another level's, and cells the faction sees now are clear; the minimap shows the level
 *   save_load_keeps_view_and_world  after the switches, a save (DataManager.makeSaveContents) loaded into fresh game objects
 *                                   restores the world state (units with cells and levels, tile and object diffs, level
 *                                   strata, seed) and, after a new Scene_Map, the same level, map, view cell, camera, plate
 *                                   and saved view record (state.view); a switch after the load is in place again
 *   no_errors                       no window error, unhandled rejection, scene exception or console.error during the suite
 *
 * Mutants (--mutant=<name>; --mutants runs all, each must exit 1 with its designated check among the failures). Each is
 * an exact source edit in the snapshot's plugin copy; the target must occur exactly once (else exit 2):
 *   transfer_switch      -> same_scene_and_spriteset      Levels.setView never tries the in-place swap (the old transfer)
 *   pause_during_switch  -> ticks_never_skipped           the simulation is paused from the request until the rebind
 *   no_prewarm           -> no_sync_build_after_prewarm   the prewarm is switched off
 *   slow_rebind          -> switch_within_one_frame       the Spriteset rebinds 3 updates late
 *   stale_sprites        -> new_level_shown_at_once       the rebind makes no sprites for the new level's events
 *   no_fog_refresh       -> new_level_shown_at_once       the fog is not refreshed when the switch completes
 *   save_view_stale      -> save_load_keeps_view_and_world  the in-place switch doesn't record state.view
 *   error_injected       -> no_errors                     the rebind logs a console.error (an uncaught throw or rejection
 *                                                         stops RMMZ itself: the run then fails as suite_completed)
 *
 * Options:
 *   --ref=<git ref>   run the files under game/ as they are in <ref> (e.g. main): every file that differs between the
 *                     working tree and <ref> is replaced by <ref>'s version in the snapshot (the bench on main)
 *   --seed=<n>        world seed (default 18)
 *   --evidence=<dir>  copy results.txt, the suite's screenshots and layer_switch_perf.json there
 *   --keep            keep the snapshot folder
 * Usage: node tools/test_layer_switch_inplace.js [--mutant=<name> | --mutants] [--ref=<ref>] [--evidence=<dir>]
 * Exit: 0 all passed, 1 a check failed (with --mutants: a mutant not caught), 2 harness problem.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SUITE = "layer_switch_inplace";
const PLUGIN = "DEUS_TestLayerSwitch";
const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const flag = name => process.argv.includes(`--${name}`);
const CHECKS = ["same_scene_and_spriteset", "ticks_never_skipped", "no_sync_build_after_prewarm", "switch_within_one_frame",
    "new_level_shown_at_once", "save_load_keeps_view_and_world", "no_errors"];

//-----------------------------------------------------------------------------
// Mutants: exact source edits in the snapshot (each target exactly once)

const L_ = "DEUS_Levels.js", W_ = "DEUS_World.js";
const FINISH_TAIL = "            syncBuilds: p.swap.built ? 1 : 0, events: p.swap.events\n        };\n        emit(\"levels:viewChanged\", p.from, p.to);";
const MUTANTS = {
    transfer_switch: { check: "same_scene_and_spriteset", edits: [[L_,
        "const swap = W.switchViewInPlace ? W.switchViewInPlace(v.x, v.y, z, px, py, $gamePlayer.direction()) : null;",
        "const swap = null; /* MUTANT: the old transfer */"]] },
    pause_during_switch: { check: "ticks_never_skipped", edits: [
        [L_, "            pending.swap = swap;\n", "            pending.swap = swap;\n            if (window.UF.Time) UF.Time.pause(); /* MUTANT: the world stops during the switch */\n"],
        [L_, FINISH_TAIL, FINISH_TAIL.replace("        emit(", "        if (window.UF.Time) UF.Time.resume(); /* MUTANT */\n        emit(")]] },
    no_prewarm: { check: "no_sync_build_after_prewarm", edits: [[W_, "const WARM = { enabled: true };", "const WARM = { enabled: false }; /* MUTANT: no prewarm */"]] },
    slow_rebind: { check: "switch_within_one_frame", edits: [[L_,
        "        if (this._ufBoundMap !== window.$dataMap) finishSwitch(this);",
        "        if (this._ufBoundMap !== window.$dataMap && (this._ufMutantWait = (this._ufMutantWait || 0) + 1) > 3) { this._ufMutantWait = 0; finishSwitch(this); } /* MUTANT: 3 updates late */"]] },
    stale_sprites: { check: "new_level_shown_at_once", edits: [[W_,
        "        for (const ev of live) if (!drawn.has(ev)) fresh.push(new Sprite_Character(ev));",
        "        /* MUTANT: no sprites for the new level's events */"]] },
    no_fog_refresh: { check: "new_level_shown_at_once", edits: [[L_,
        "        if (window.UF.Fog && typeof UF.Fog.refresh === \"function\") UF.Fog.refresh();",
        "        /* MUTANT: no fog refresh */"]] },
    save_view_stale: { check: "save_load_keeps_view_and_world", edits: [[L_,
        "            W.state.view = { x: $gamePlayer.x, y: $gamePlayer.y, z };",
        "            /* MUTANT: the view is not recorded */"]] },
    error_injected: { check: "no_errors", edits: [[W_,
        "        ss._ufBoundMap = map;\n",
        "        ss._ufBoundMap = map;\n        console.error(\"MUTANT: injected error\");\n"]] }
};

//-----------------------------------------------------------------------------
// The suite (runs inside NW.js; written into the snapshot as a plugin)

function suitePlugin() {
    "use strict";
    const T = window.UF && window.UF.Test;
    if (!T || !T.active) return;
    T.suite("layer_switch_inplace", async t => {
        const W = UF.World, L = UF.Levels;
        const fs = require("fs"), path = require("path");
        const outDir = path.join(nw.__dirname || process.cwd(), "test_output");
        // Errors during the suite: the harness's (window errors, rejections, scene exceptions) and console.error (F8).
        const errors0 = t.errorsSoFar().length, consoleErrors = [], realConsoleError = console.error;
        console.error = function(...a) {
            consoleErrors.push(a.map(x => (x && x.stack) || String(x)).join(" ").slice(0, 300));
            return realConsoleError.apply(this, a);
        };
        const perf = { suite: "layer_switch_inplace", made: new Date().toISOString(), seed: W.state ? W.state.seed : null, inPlaceApi: typeof W.switchViewInPlace === "function",
            units: 0, unitsByLevel: {}, prewarm: null, prewarmWaitMs: null, switches: [], load: null };
        const writePerf = () => { try { fs.writeFileSync(path.join(outDir, "layer_switch_perf.json"), JSON.stringify(perf, null, 2)); } catch (_) { /* reported by the tool */ } };
        const scene = () => SceneManager._scene;
        const settled = () => scene() instanceof Scene_Map && scene().isStarted() && !$gamePlayer.isTransferring() && !L.switching();
        const EB = W.EVENT_BASE, LEVELS = [-2, -1, 0, 1, 2];
        const label = z => L.label(z);
        const round2 = v => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : v);

        await t.waitUntil(settled, 30000, "the map to settle");
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        if (UF.Time) { if (UF.Time.paused) UF.Time.resume(); UF.Time.setLevel(0); }
        if (L.view() !== 0) {
            L.setView(0);
            await t.waitUntil(() => settled() && L.view() === 0, 20000, "the ground").catch(() => {});
        }
        const home = W.viewLevel(), area = { x: home.x, y: home.y }, size = W.state.size;
        const tw0 = performance.now();
        if (typeof W.coldLevels === "function") await t.waitUntil(() => W.coldLevels().length === 0, 15000, "the prewarm").catch(() => {});
        perf.prewarmWaitMs = round2(performance.now() - tw0);
        perf.prewarm = typeof W.prewarmStats === "function" ? W.prewarmStats() : null;

        //------------------------------------------------------------ fixtures: a TEST unit on every level, in view
        const cx = $gamePlayer.x, cy = $gamePlayer.y;
        const img = { characterName: "People1", characterIndex: 2 };
        const testUnits = {};
        for (const z of LEVELS) {
            let x = Math.max(4, Math.min(size - 5, cx - 4 + 2 * (z + 2))), y = Math.max(4, Math.min(size - 5, cy + 2));
            if (z !== 0) L.setShape({ area, x, y, z }, "floor", { constructed: true, material: z > 0 ? "wood" : "stone" });
            else { const c = W.spawnCellFor(area.x, area.y, x, y, 6, "TEST_lsw_0", 0); x = c.x; y = c.y; }
            testUnits[z] = W.addUnit({ name: `TEST_lsw_${z}`, image: img, area, x, y, z, exact: true, data: { kind: "test" } });
        }
        // Fog (disabled in play since 2026-09-22): the second pass forces it on so its level binding can be checked. One cell
        // per level that no level has explored gets explored on that level only.
        const Fog = UF.Fog, fogWas = Fog ? Fog.enabled : null;
        const fogCells = {};
        if (Fog) {
            Fog.enabled = true;
            let k = 0;
            for (const z of LEVELS) {
                for (; k < 400; k++) {
                    const c = { x: 6 + (k % 40) * 5, y: 6 + Math.floor(k / 40) * 5 };
                    if (LEVELS.every(o => !Fog.isExplored(c.x, c.y, o))) { fogCells[z] = c; k++; break; }
                }
                if (fogCells[z]) Fog.reveal(fogCells[z].x, fogCells[z].y, 0, z);
            }
            Fog.enabled = fogWas;
        }
        await t.waitFrames(3);
        perf.units = W.units().length;
        for (const z of LEVELS) perf.unitsByLevel[z] = W.unitsInArea(area.x, area.y, z).length;

        //------------------------------------------------------------ instruments (test-side wrappers, removed at the end)
        let scenesMade = 0, spritesetsMade = 0, builds = 0, phase = "idle";
        const buildLog = [];
        const sInit = Scene_Map.prototype.initialize, ssInit = Spriteset_Map.prototype.initialize, realBuild = W.buildArea;
        Scene_Map.prototype.initialize = function() { scenesMade++; return sInit.apply(this, arguments); };
        Spriteset_Map.prototype.initialize = function() { spritesetsMade++; return ssInit.apply(this, arguments); };
        W.buildArea = function(ax, ay, z) { builds++; buildLog.push({ z, phase }); return realBuild.apply(this, arguments); };
        const snap = () => ({ ticks: UF.Time ? UF.Time.ticks() : -1, wf: W._frame, frame: Graphics.frameCount, paused: !!(UF.Time && UF.Time.paused), t: performance.now() });
        let samples = null;
        const realUpdateMain = SceneManager.updateMain;
        SceneManager.updateMain = function() {
            const a = samples ? snap() : null;
            realUpdateMain.apply(this, arguments);
            if (samples) {
                const b = snap();
                samples.push({ dTicks: b.ticks - a.ticks, dW: b.wf - a.wf, ms: b.t - a.t, paused: a.paused || b.paused });
            }
        };
        const restore = () => {
            Scene_Map.prototype.initialize = sInit;
            Spriteset_Map.prototype.initialize = ssInit;
            W.buildArea = realBuild;
            SceneManager.updateMain = realUpdateMain;
            if (Fog) Fog.enabled = fogWas;
            console.error = realConsoleError;
        };

        //------------------------------------------------------------ what is on screen right now
        const fullSprites = ss => (ss && ss._characterSprites) || [];
        function inspect(z, before) {
            const s = scene(), ss = s && s._spriteset, mapId = $gameMap.mapId(), want = W.areaMapId(area.x, area.y, z);
            const bad = [];
            if (L.view() !== z) bad.push(`view ${L.view()}`);
            if (mapId !== want) bad.push(`map ${mapId} (want ${want})`);
            if (!$dataMap || !$dataMap.ufArea || ($dataMap.ufArea.z || 0) !== z) bad.push(`$dataMap level ${$dataMap && $dataMap.ufArea ? $dataMap.ufArea.z : "?"}`);
            if (!ss || !ss._tilemap || ss._tilemap._mapData !== $dataMap.data) bad.push("tilemap not on $dataMap.data");
            if (ss && ss._tileset !== $gameMap.tileset()) bad.push("tileset not the map's");
            if (L.plateText() !== label(z)) bad.push(`plate "${L.plateText()}"`);
            // The view (player): same cell, same sprite, camera kept.
            if ($gamePlayer.x !== before.px || $gamePlayer.y !== before.py) bad.push(`view cell (${$gamePlayer.x},${$gamePlayer.y}) was (${before.px},${before.py})`);
            const ps = fullSprites(ss).find(sp => sp._character === $gamePlayer);
            if (!ps || ps !== before.playerSprite || !ps.parent) bad.push("the view's sprite replaced or detached");
            if (Math.abs($gameMap.displayX() - before.dx) > 0.01 || Math.abs($gameMap.displayY() - before.dy) > 0.01) bad.push(`camera (${$gameMap.displayX().toFixed(2)},${$gameMap.displayY().toFixed(2)}) was (${before.dx.toFixed(2)},${before.dy.toFixed(2)})`);
            // Units: every unit of the level has an event and a sprite; no event or sprite of another level.
            const units = W.unitsInArea(area.x, area.y, z), unitIds = new Set(units.map(u => u.id));
            const evIds = $gameMap.events().filter(e => e.eventId() >= EB).map(e => e.eventId() - EB);
            const extra = evIds.filter(id => !unitIds.has(id)), missing = units.filter(u => !$gameMap._events[EB + u.id]).map(u => u.id);
            const live = new Set($gameMap.events());
            const evSprites = fullSprites(ss).filter(sp => sp._character instanceof Game_Event);
            const stale = evSprites.filter(sp => !live.has(sp._character)).length;
            const drawn = new Set(evSprites.map(sp => sp._character));
            const unsprited = $gameMap.events().filter(e => !drawn.has(e)).length;
            if (extra.length || missing.length) bad.push(`unit events: ${missing.length} missing, ${extra.length} of other levels`);
            if (stale || unsprited) bad.push(`sprites: ${stale} of another level's events, ${unsprited} events without one`);
            const mine = testUnits[z], mineEv = mine && $gameMap._events[EB + mine.id];
            if (!mineEv || !drawn.has(mineEv)) bad.push(`TEST unit of ${label(z)} not drawn`);
            for (const o of LEVELS) if (o !== z && testUnits[o] && $gameMap._events[EB + testUnits[o].id]) bad.push(`TEST unit of ${label(o)} on screen`);
            // Layers of the kept Spriteset.
            const objL = ss && ss._ufObjectLayer, itemL = ss && ss._ufItems, depth = ss && ss._ufDepth;
            if (objL && (!objL._seen || objL._seen.mapId !== mapId || objL._seen.grid !== $dataMap.ufObjects)) bad.push("objects layer not on this level");
            if (itemL && itemL._mapId !== mapId) bad.push("items layer not on this level");
            if (depth && depth.viewZ !== z) bad.push(`depth planes for ${depth.viewZ}`);
            // Fog: this level's explored cell dim or clear, the other levels' cells dark; observer cells clear now.
            let fog = "not loaded";
            if (Fog && ss && ss._ufFog && !Fog.enabled) {
                fog = ss._ufFog.visible ? "SHOWN while disabled" : "hidden (disabled in play)";
                if (ss._ufFog.visible) bad.push("fog shown while disabled");
            } else if (Fog && ss && ss._ufFog) {
                const sp = ss._ufFog, bmp = sp._fogBitmap;
                if (z > 0) fog = sp.visible ? "SHOWN above ground" : "hidden above ground";
                else if (!sp.visible || !bmp) fog = "NOT SHOWN";
                else {
                    const a = c => bmp.getAlphaPixel(c.x, c.y);
                    const own = fogCells[z] ? a(fogCells[z]) : -1;
                    const others = LEVELS.filter(o => o !== z && fogCells[o]).map(o => a(fogCells[o]));
                    const obs = Fog.observers().slice(0, 6);
                    const obsClear = obs.filter(o => a(o) === 0).length;
                    fog = `own cell alpha ${own}, other levels' cells ${others.join("/")}, observers clear ${obsClear}/${obs.length}`;
                    if (!(own >= 0 && own < 255) || others.some(v => v !== 255) || obsClear !== obs.length) bad.push(`fog: ${fog}`);
                }
                if (z > 0 && sp.visible) bad.push("fog shown above ground");
            }
            // Minimap.
            const M = UF.Minimap, hud = s && s._deusMinimap;
            let mini = "not loaded";
            if (M) {
                mini = `activeZ ${M.activeZ}, HUD ${hud ? (hud === before.minimap ? "kept" : "REPLACED") : "none"}`;
                if (M.activeZ !== z || (before.minimap && hud !== before.minimap) || (hud && hud._baseSprite && hud._baseSprite.bitmap !== M.baseBitmap())) bad.push(`minimap: ${mini}`);
            }
            return { ok: bad.length === 0, bad, units: units.length, events: evIds.length, fog, mini };
        }

        //------------------------------------------------------------ one switch, measured
        const result = { scenes: [], builds: [], ticks: [], frames: [], shown: [], order: [] };
        async function doSwitch(z, opts = {}) {
            const s0 = scene(), ss0 = s0 && s0._spriteset;
            const before = { px: $gamePlayer.x, py: $gamePlayer.y, dx: $gameMap.displayX(), dy: $gameMap.displayY(),
                playerSprite: fullSprites(ss0).find(sp => sp._character === $gamePlayer), minimap: s0 && s0._deusMinimap };
            const from = L.view(), n0 = L.stats().switches, b0 = builds, sm0 = scenesMade, ssm0 = spritesetsMade;
            const k0 = { ticks: UF.Time ? UF.Time.ticks() : -1, wf: W._frame };
            samples = [];
            phase = `switch ${from}->${z}`;
            const ok = L.setView(z);
            let timedOut = false;
            await t.waitUntil(() => settled() && L.view() === z, 15000, `the switch to ${label(z)}`).catch(() => { timedOut = true; });
            const shown = opts.inspect ? inspect(z, before) : null;
            const last = L.stats().lastSwitch ? Object.assign({}, L.stats().lastSwitch) : null;
            const bDone = builds;
            await t.waitFrames(2);
            phase = "idle";
            const smp = samples;
            samples = null;
            const s1 = scene(), ss1 = s1 && s1._spriteset;
            const rec = {
                from, to: z, ok, timedOut, sameScene: s1 === s0, sameSpriteset: ss1 === ss0, scenesMade: scenesMade - sm0, spritesetsMade: spritesetsMade - ssm0,
                builds: builds - b0, buildsAtDone: bDone - b0, updates: smp.length, skipped: smp.filter(x => !x.paused && x.dTicks !== 1).length,
                wSkipped: smp.filter(x => !x.paused && x.dW !== 1).length, pausedUpdates: smp.filter(x => x.paused).length,
                ticksMoved: (UF.Time ? UF.Time.ticks() : 0) - k0.ticks, framesMoved: W._frame - k0.wf, maxUpdateMs: round2(Math.max(0, ...smp.map(x => x.ms))),
                newRecord: L.stats().switches === n0 + 1, last: last ? Object.fromEntries(Object.entries(last).map(([k, v]) => [k, round2(v)])) : null,
                world: typeof W.viewSwitchStats === "function" ? W.viewSwitchStats() : null,
                shown: shown ? { ok: shown.ok, bad: shown.bad, units: shown.units, events: shown.events, fog: shown.fog, minimap: shown.mini } : null
            };
            perf.switches.push(Object.assign({ round: opts.round || 0 }, rec));
            if (opts.shot) t.screenshot(opts.shot);
            return rec;
        }

        //------------------------------------------------------------ the sequence (fog as in play, then fog forced on), the bench rounds
        const seq = [1, 2, 0, -1, 0];
        const recs = [];
        for (const z of seq) recs.push(Object.assign(await doSwitch(z, { inspect: true, round: 1, shot: `${recs.length + 1}_${label(z).replace("+", "p").replace("-", "m")}` }), { pass: "play" }));
        if (Fog) Fog.enabled = true;
        for (const z of seq) recs.push(Object.assign(await doSwitch(z, { inspect: true, round: 2, shot: z === 0 && recs.length === 7 ? "fog_on_Ground" : null }), { pass: "fog on" }));
        if (Fog) Fog.enabled = fogWas;
        for (const round of [3, 4]) for (const z of seq) await doSwitch(z, { round });
        writePerf();
        const fmt = r => `${r.pass === "fog on" ? "[fog on] " : ""}${label(r.from)}->${label(r.to)}`;

        t.check("same_scene_and_spriteset", recs.every(r => r.ok && !r.timedOut && r.sameScene && r.sameSpriteset && r.scenesMade === 0 && r.spritesetsMade === 0),
            recs.map(r => `${fmt(r)}: scene ${r.sameScene ? "same" : "NEW"}, spriteset ${r.sameSpriteset ? "same" : "NEW"}, Scene_Map made ${r.scenesMade}, Spriteset_Map made ${r.spritesetsMade}${r.timedOut ? ", TIMED OUT" : ""}${r.ok ? "" : ", setView refused"}`).join("; "));
        t.check("ticks_never_skipped", recs.every(r => r.updates > 0 && r.skipped === 0 && r.wSkipped === 0 && r.pausedUpdates === 0 && r.ticksMoved > 0 && r.framesMoved > 0),
            recs.map(r => `${fmt(r)}: ${r.updates} updates, ${r.skipped} without exactly one UF.Time tick, ${r.wSkipped} without exactly one World frame, ${r.pausedUpdates} paused; ticks +${r.ticksMoved}, World frames +${r.framesMoved}`).join("; ") + " (speed 1x, from the request to 2 frames after the switch completed)");
        const cold = perf.prewarm ? perf.prewarm.cold : null;
        t.check("no_sync_build_after_prewarm", Array.isArray(cold) && cold.length === 0 && recs.every(r => r.builds === 0),
            `prewarm: ${perf.prewarm ? `cold ring levels ${JSON.stringify(cold)} after ${perf.prewarmWaitMs} ms, ${perf.prewarm.builds} prewarm builds (${round2(perf.prewarm.ms)} ms, worst ${round2(perf.prewarm.maxMs)} ms), ${perf.prewarm.loadSteps} steps while the map loaded` : "NO PREWARM API"}; ` +
            recs.map(r => `${fmt(r)}: UF.World.buildArea calls ${r.builds}`).join(", ") + ` (levels built: ${JSON.stringify(buildLog.filter(b => b.phase !== "idle"))})`);
        t.check("switch_within_one_frame", recs.every(r => r.newRecord && r.last && r.last.to === r.to && r.last.inPlace === true && r.last.frames <= 1 && r.last.renderFrames <= 1 && Number.isFinite(r.last.ms)),
            recs.map(r => `${fmt(r)}: ${r.last ? `frames ${r.last.frames}, renderFrames ${r.last.renderFrames}, ms ${r.last.ms} (work ${r.last.workMs}: swap ${r.last.swapMs}, rebind ${r.last.rebindMs}, fog ${r.last.fogMs}), in place ${r.last.inPlace}, reused ${r.last.reused}` : "NO lastSwitch"}${r.newRecord ? "" : ", NOT A NEW RECORD"}; worst update ${r.maxUpdateMs} ms`).join("; "));
        t.check("new_level_shown_at_once", recs.every(r => r.shown && r.shown.ok),
            recs.map(r => `${fmt(r)}: ${r.shown ? (r.shown.ok ? `ok (${r.shown.events} unit events for ${r.shown.units} units; fog ${r.shown.fog}; minimap ${r.shown.minimap})` : `WRONG: ${r.shown.bad.join(" | ")}`) : "not inspected"}`).join("; "));

        //------------------------------------------------------------ save and load after several switches
        await doSwitch(-1, { round: 5 });
        await doSwitch(1, { round: 5, shot: "6_before_save_p1" });
        const st = W.state;
        const viewBefore = { z: L.view(), mapId: $gameMap.mapId(), px: $gamePlayer.x, py: $gamePlayer.y, dx: $gameMap.displayX(), dy: $gameMap.displayY(),
            record: JSON.stringify(st.view), plate: L.plateText() };
        const unitKey = s => Object.values(s.units).map(u => `${u.id}:${u.area.x},${u.area.y},${u.x},${u.y},${u.z | 0}`).sort().join(";");
        const worldKeys = s => ({ units: unitKey(s), diffs: JSON.stringify(s.diffs), objectDiffs: JSON.stringify(s.objectDiffs), levels: JSON.stringify(s.levels), seed: s.seed, nextUnitId: s.nextUnitId });
        const contents = DataManager.makeSaveContents();
        const json = JsonEx.stringify(contents);
        const savedWorld = worldKeys(JsonEx.parse(JsonEx.stringify(contents.ufWorld)));
        scenesMade = 0;
        DataManager.createGameObjects();
        DataManager.extractSaveContents(JsonEx.parse(json));
        const loadedWorld = worldKeys(W.state);
        const worldDiff = Object.keys(savedWorld).filter(k => savedWorld[k] !== loadedWorld[k]);
        const tl0 = performance.now(), loadDiag = { readyCalls: 0, readyTrue: 0, builds0: builds, warm0: typeof W.prewarmStats === "function" ? W.prewarmStats().loadSteps : null };
        const realReady = Scene_Map.prototype.isReady;
        Scene_Map.prototype.isReady = function() { loadDiag.readyCalls++; const r = realReady.apply(this, arguments); if (r) loadDiag.readyTrue++; return r; };
        phase = "load";
        const savedScene = scene();
        SceneManager.goto(Scene_Map);
        let loadTimedOut = false;
        await t.waitUntil(() => scene() !== savedScene && settled() && scene()._spriteset && W.viewLevel(), 90000, "the loaded game's map").catch(() => { loadTimedOut = true; });
        Scene_Map.prototype.isReady = realReady;
        phase = "idle";
        loadDiag.builds = builds - loadDiag.builds0;
        loadDiag.buildLog = buildLog.filter(b => b.phase === "load").map(b => b.z);
        loadDiag.prewarmAtStart = typeof W.prewarmStats === "function" ? W.prewarmStats() : null;
        await t.waitFrames(3);
        const loadMs = performance.now() - tl0;
        const viewAfter = { z: L.view(), mapId: $gameMap.mapId(), px: $gamePlayer.x, py: $gamePlayer.y, dx: $gameMap.displayX(), dy: $gameMap.displayY(),
            record: JSON.stringify(W.state.view), plate: L.plateText() };
        const recordMatches = W.state.view && W.state.view.z === viewAfter.z && W.state.view.x === viewAfter.px && W.state.view.y === viewAfter.py;
        const viewDiff = Object.keys(viewBefore).filter(k => (typeof viewBefore[k] === "number" ? Math.abs(viewBefore[k] - viewAfter[k]) > 0.01 : viewBefore[k] !== viewAfter[k]));
        const lvAfter = W.viewLevel();
        const unitsOnView = lvAfter ? W.unitsInArea(lvAfter.x, lvAfter.y, lvAfter.z) : [];
        const missingEv = unitsOnView.filter(u => !$gameMap._events[EB + u.id]).length;
        t.screenshot("7_after_load");
        const loadedScene = scene();
        const again = await doSwitch(0, { round: 6 });
        perf.load = { ms: round2(loadMs), scenesMade, diag: loadDiag, prewarm: typeof W.prewarmStats === "function" ? W.prewarmStats() : null };
        writePerf();
        t.check("save_load_keeps_view_and_world",
            !loadTimedOut && loadedScene !== savedScene && worldDiff.length === 0 && viewDiff.length === 0 && recordMatches && missingEv === 0 && again.sameScene && scene() === loadedScene && again.last && again.last.inPlace === true,
            `saved on ${label(viewBefore.z)} after ${perf.switches.length - 1} switches (${json.length} characters of JSON); world after the load: ${worldDiff.length ? `DIFFERS in ${worldDiff.join(", ")}` : "units (cells, levels), tile and object diffs, level strata, seed and next unit id the same"}; ` +
            `view before ${JSON.stringify(viewBefore)} after ${JSON.stringify(viewAfter)}${viewDiff.length ? ` (DIFFERS in ${viewDiff.join(", ")})` : " (same)"}; saved view record ${recordMatches ? "matches the view" : "DOES NOT MATCH the view"}; ` +
            `${unitsOnView.length} units on the loaded level, ${missingEv} without an event; load to map ${Math.round(loadMs)} ms${loadTimedOut ? " (TIMED OUT)" : ""}; ` +
            `then ${label(again.from)}->${label(again.to)} ${again.last && again.last.inPlace ? "in place" : "NOT IN PLACE"}, scene ${again.sameScene ? "kept" : "NEW"}`);

        restore();
        await t.waitFrames(5);
        const errs = t.errorsSoFar().slice(errors0);
        t.check("no_errors", errs.length === 0 && consoleErrors.length === 0,
            `harness errors during the suite: ${errs.length ? `${errs.length}, first: ${errs[0]}` : `none (${errors0} before it)`}; console.error calls: ${consoleErrors.length ? `${consoleErrors.length}, first: ${consoleErrors[0]}` : "none"}`);
        writePerf();
    }, { isDefault: false });
}

//-----------------------------------------------------------------------------
// Snapshot, run, results

function log(...a) { if (!flag("quiet")) console.log(...a); }

function makeSnapshot(tag, ref, mutantName, seed) {
    const dir = path.join(os.tmpdir(), "deus_layer_switch", `${tag}_${process.pid}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const rc = spawnSync("robocopy", [path.join(ROOT, "game"), dir, "/E", "/NDL", "/NFL", "/NJH", "/NJS", "/NC", "/NS", "/NP", "/XD", "test_output", "save"], { stdio: "ignore" });
    if (rc.status === null || rc.status >= 8) throw new Error(`robocopy failed (${rc.status})`);
    if (ref) {
        const names = execFileSync("git", ["-C", ROOT, "diff", "--name-only", ref, "--", "game"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
        for (const name of names) {
            const dst = path.join(dir, name.replace(/^game\//, ""));
            let body = null;
            try { body = execFileSync("git", ["-C", ROOT, "show", `${ref}:${name}`], { maxBuffer: 256 * 1024 * 1024 }); } catch (_) { body = null; }
            if (body === null) fs.rmSync(dst, { force: true });
            else { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, body); }
        }
        log(`snapshot at ${ref}: ${names.length} file(s) under game/ taken from ${ref}: ${names.join(", ") || "none"}`);
    }
    if (mutantName) {
        const m = MUTANTS[mutantName];
        for (const [file, from, to] of m.edits) {
            const p = path.join(dir, "js", "plugins", file);
            const src = fs.readFileSync(p, "utf8");
            const n = src.split(from).length - 1;
            if (n !== 1) throw new Error(`mutant ${mutantName}: target occurs ${n} times in ${file}`);
            fs.writeFileSync(p, src.replace(from, () => to));
        }
    }
    fs.writeFileSync(path.join(dir, "js", "plugins", `${PLUGIN}.js`),
        `// Test-only plugin written by tools/test_layer_switch_inplace.js into a snapshot copy. Never part of the game.\n(${suitePlugin.toString()})();\n`);
    const pj = path.join(dir, "js", "plugins.js");
    const text = fs.readFileSync(pj, "utf8").replace(/^﻿/, "");
    const plugins = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    const world = plugins.find(p => p.name === "DEUS_World");
    if (!world) throw new Error("DEUS_World is not in plugins.js");
    world.parameters = Object.assign({}, world.parameters, { Seed: String(seed) });
    if (!plugins.some(p => p.name === "DEUS_Test" && p.status)) throw new Error("DEUS_Test is not registered");
    plugins.push({ name: PLUGIN, status: true, description: "[test only] SIM.00.00 layer switch suite", parameters: {} });
    fs.writeFileSync(pj, `// Generated by RPG Maker.\n// Do not edit this file directly.\nvar $plugins =\n[\n${plugins.map(p => JSON.stringify(p)).join(",\n")}\n];\n`);
    return dir;
}

function runSnapshot(dir) {
    const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "run_tests.js"), SUITE, "--game", dir], { encoding: "utf8", timeout: 420000 });
    const resultsFile = path.join(dir, "test_output", "results.txt");
    const text = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, "utf8") : "";
    const checks = {};
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^(PASS|FAIL) layer_switch_inplace\.(\S+)/);
        if (m) checks[m[2]] = m[1] === "PASS";
    }
    const resultLine = (text.match(/^RESULT: .*$/m) || [""])[0];
    return { status: r.status, text, checks, resultLine, stderr: r.stderr || "" };
}

function saveEvidence(dir, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const out = path.join(dir, "test_output");
    if (!fs.existsSync(out)) return [];
    const copied = [];
    for (const f of fs.readdirSync(out)) {
        if (f === "results.txt" || f === "layer_switch_perf.json" || (f.startsWith(`${SUITE}.`) && f.endsWith(".png"))) {
            fs.copyFileSync(path.join(out, f), path.join(dest, f));
            copied.push(f);
        }
    }
    return copied;
}

function runOne(mutantName) {
    const ref = arg("ref", "");
    const seed = Number(arg("seed", "18"));
    const tag = mutantName ? `mutant_${mutantName}` : (ref ? `ref_${ref.replace(/[^\w.-]/g, "_")}` : "tip");
    const dir = makeSnapshot(tag, ref, mutantName, seed);
    log(`running suite ${SUITE} on ${dir}${mutantName ? ` (mutant ${mutantName})` : ""}, seed ${seed}`);
    const t0 = Date.now();
    const r = runSnapshot(dir);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const evidence = arg("evidence", "");
    if (evidence && !mutantName) log(`evidence copied: ${saveEvidence(dir, path.resolve(evidence)).join(", ")}`);
    if (!flag("keep")) fs.rmSync(dir, { recursive: true, force: true });
    return Object.assign(r, { secs, dir });
}

function main() {
    if (flag("mutants")) {
        const names = Object.keys(MUTANTS);
        let uncaught = 0, broken = 0;
        for (const name of names) {
            let r;
            try { r = runOne(name); } catch (e) { console.log(`MUTANT ${name}: HARNESS ${e.message}`); broken++; continue; }
            const want = MUTANTS[name].check;
            const failed = Object.keys(r.checks).filter(k => !r.checks[k]);
            const caught = r.checks[want] === false && /\(exit 1\)/.test(r.resultLine);
            if (!caught) uncaught++;
            console.log(`MUTANT ${name}: ${caught ? "CAUGHT" : "NOT CAUGHT"} by ${want} (exit ${r.status}; ${r.resultLine || "no RESULT line"}; failing: ${failed.join(", ") || "none"}; ${r.secs} s)`);
        }
        console.log(`MUTANTS: ${names.length - uncaught - broken}/${names.length} caught${broken ? `, ${broken} harness problem(s)` : ""}`);
        process.exit(broken ? 2 : uncaught ? 1 : 0);
    }
    const mutantName = arg("mutant", "");
    if (mutantName && !MUTANTS[mutantName]) {
        console.error(`unknown mutant "${mutantName}"; known: ${Object.keys(MUTANTS).join(", ")}`);
        process.exit(2);
    }
    let r;
    try { r = runOne(mutantName); } catch (e) { console.error(`HARNESS: ${e.message}`); process.exit(2); }
    for (const line of r.text.split(/\r?\n/)) if (/^(PASS|FAIL|ERROR|HARNESS|RESULT)/.test(line)) console.log(line);
    const missing = CHECKS.filter(c => !(c in r.checks));
    if (!r.resultLine) { console.error(`HARNESS: no RESULT line (run_tests exit ${r.status}) ${r.stderr.slice(0, 400)}`); process.exit(2); }
    if (missing.length) { console.error(`HARNESS: checks that never ran: ${missing.join(", ")}`); process.exit(mutantName ? 1 : 2); }
    const failed = CHECKS.filter(c => !r.checks[c]);
    console.log(`SUMMARY: ${CHECKS.length - failed.length}/${CHECKS.length} checks passed${failed.length ? `; failed: ${failed.join(", ")}` : ""}; ${r.secs} s`);
    process.exit(failed.length ? 1 : 0);
}

main();
