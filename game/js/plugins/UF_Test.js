//=============================================================================
// UF_Test.js - Test harness with checks that can fail
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Test] PASS/FAIL test harness. Does nothing unless the game is launched with --uf-test.
 * @author UF project
 *
 * @help
 * Inactive in normal play and in the editor's Playtest. It only runs
 * when nw.exe is started with --uf-test (all default suites) or
 * --uf-test=<suite> (one suite). Use run_tests.bat in the project root.
 *
 * Output (in the game folder):
 *   test_output/results.txt   one PASS/FAIL line per check, then
 *                             "RESULT: <n> passed, <m> failed"
 *   test_output/<name>.png    screenshots taken by suites
 * Exit code: run_tests.bat returns 0 = all passed, 1 = a check failed,
 * 2 = harness error or timeout. It reads the code from the RESULT line,
 * because NW.js doesn't pass process.exit codes back to the shell.
 *
 * API and rules: docs/systems/UF_Test.md
 *
 * Replaced core methods (test mode only): Scene_Boot.startNormalGame,
 * so the run skips the title screen and starts a new game; and
 * SceneManager.isGameActive, so the game keeps running when its window
 * loses focus (RMMZ normally pauses then).
 */

(() => {
    "use strict";

    const args = (typeof nw !== "undefined" && nw.App && nw.App.argv) ? nw.App.argv : [];
    const flag = args.find(a => a === "--uf-test" || a.startsWith("--uf-test="));

    window.UF = window.UF || {};

    const suites = [];
    const Test = {
        active: !!flag,
        only: flag && flag.includes("=") ? flag.split("=")[1] : null,
        results: [],
        errors: [],
        /** Register a suite. fn(t) may be async. Default suites run unless --uf-test=<name> picks one. */
        suite(name, fn, options = {}) {
            suites.push({ name, fn, isDefault: options.isDefault !== false });
        }
    };
    window.UF.Test = Test;

    if (!Test.active) return;

    const fs = require("fs");
    const path = require("path");
    const baseDir = (nw.__dirname) || process.cwd();
    const outDir = path.join(baseDir, "test_output");
    fs.mkdirSync(outDir, { recursive: true });
    for (const f of fs.readdirSync(outDir)) {
        if (f.endsWith(".png") || f === "results.txt") fs.unlinkSync(path.join(outDir, f));
    }

    const lines = [];
    const write = line => {
        lines.push(line);
        console.log(line);
        fs.writeFileSync(path.join(outDir, "results.txt"), lines.join("\n") + "\n");
    };
    write(`UF_Test run ${new Date().toISOString()} args=${JSON.stringify(args.filter(a => a.startsWith("--uf")))}`);

    //-------------------------------------------------------------------------
    // Error capture: every uncaught error or failed load is recorded.

    const recordError = (kind, detail) => {
        Test.errors.push(`${kind}: ${detail}`);
        write(`ERROR ${kind}: ${detail}`);
    };
    window.addEventListener("error", e => recordError("window.error", `${e.message} at ${e.filename}:${e.lineno}`));
    window.addEventListener("unhandledrejection", e => recordError("unhandledrejection", String(e.reason && e.reason.stack || e.reason)));

    const _catchException = SceneManager.catchException;
    SceneManager.catchException = function(e) {
        recordError("scene.exception", e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : JSON.stringify(e));
        _catchException.call(this, e);
        setTimeout(() => finish(2, "SceneManager stopped after an exception"), 500);
    };

    //-------------------------------------------------------------------------
    // Frame waiting

    const waiters = [];
    const _updateMain = SceneManager.updateMain;
    SceneManager.updateMain = function() {
        _updateMain.call(this);
        for (let i = waiters.length - 1; i >= 0; i--) {
            if (waiters[i].test()) {
                waiters[i].resolve();
                waiters.splice(i, 1);
            }
        }
    };
    const waitUntil = (test, timeoutMs, what) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms waiting for ${what}`)), timeoutMs);
        waiters.push({ test, resolve: () => { clearTimeout(timer); resolve(); } });
    });
    const waitFrames = n => {
        const target = Graphics.frameCount + n;
        return waitUntil(() => Graphics.frameCount >= target, n * 100 + 5000, `${n} frames`);
    };

    //-------------------------------------------------------------------------
    // The object handed to each suite

    const makeContext = suiteName => ({
        check(name, condition, detail = "") {
            const pass = !!condition;
            Test.results.push({ suite: suiteName, name, pass, detail });
            write(`${pass ? "PASS" : "FAIL"} ${suiteName}.${name}${detail ? " - " + detail : ""}`);
            return pass;
        },
        waitFrames,
        waitUntil,
        screenshot(name) {
            const file = path.join(outDir, `${suiteName}.${name}.png`);
            const data = SceneManager.snap().canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(file, data, "base64");
            write(`SHOT ${file}`);
            return file;
        },
        errorsSoFar: () => Test.errors.slice()
    });

    //-------------------------------------------------------------------------
    // Runner

    let finished = false;
    function finish(code, reason) {
        if (finished) return;
        finished = true;
        const passed = Test.results.filter(r => r.pass).length;
        const failed = Test.results.length - passed;
        if (reason) write(`HARNESS ${reason}`);
        if (code === 2) {
            try {
                const scene = SceneManager._scene ? SceneManager._scene.constructor.name : "none";
                write(`HARNESS current scene: ${scene}`);
                makeContext("harness").screenshot("on_failure");
            } catch (e) {
                write(`HARNESS screenshot failed: ${e.message}`);
            }
        }
        if (code === 0 && failed > 0) code = 1;
        if (code === 0 && Test.results.length === 0) {
            write("HARNESS no checks ran");
            code = 2;
        }
        write(`RESULT: ${passed} passed, ${failed} failed (exit ${code})`);
        setTimeout(() => process.exit(code), 200);
    }

    // RMMZ pauses the whole game while its window doesn't have focus. Test windows lose focus whenever
    // anyone uses the machine, which froze scenes mid-check. In test mode, always keep running.
    SceneManager.isGameActive = function() {
        return true;
    };

    // Skip the title screen: go straight into a new game.
    Scene_Boot.prototype.startNormalGame = function() {
        this.checkPlayerLocation();
        DataManager.setupNewGame();
        SceneManager.goto(Scene_Map);
    };

    async function run() {
        try {
            await waitUntil(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && ImageManager.isReady(),
                30000, "the map scene to start");
            await waitFrames(60); // let the fade-in finish
            const selected = suites.filter(s => Test.only ? s.name === Test.only : s.isDefault);
            if (selected.length === 0) return finish(2, `no suite named "${Test.only}"`);
            for (const s of selected) {
                write(`SUITE ${s.name}`);
                try {
                    await s.fn(makeContext(s.name));
                } catch (e) {
                    const where = String(e.stack || "").split("\n").slice(1, 4).map(l => l.trim()).join(" | ");
                    makeContext(s.name).check("suite_completed", false, `${e.message} [${where}]`);
                }
            }
            finish(0);
        } catch (e) {
            finish(2, e.message);
        }
    }

    setTimeout(() => finish(2, "watchdog: whole run took longer than 180 s"), 180000);
    run(); // plugins load after window "load" has fired, so start directly; run() waits for the map


    //-------------------------------------------------------------------------
    // Built-in suites

    // Proves the FAIL path works. Run it on its own: --uf-test=selftest
    Test.suite("selftest", t => {
        t.check("pass_path", true, "this check must PASS");
        t.check("fail_path", false, "this check must FAIL (deliberate)");
    }, { isDefault: false });

    // What any build must satisfy right now (VISION V2/V4, ENGINE_RULES §2).
    Test.suite("smoke", async t => {
        const scene = SceneManager._scene;
        t.check("reached_map", scene instanceof Scene_Map && !!$dataMap, $dataMap ? `map ${$gameMap.mapId()} "${$gameMap.displayName()}"` : "no map");

        const sprites = scene._spriteset ? scene._spriteset._characterSprites : [];
        const spriteOf = ch => sprites.find(s => s._character === ch);
        const visiblePixels = sp => {
            const b = sp.bitmap, f = sp._frame;
            if (!b || !b.isReady() || !f || f.width === 0) return 0;
            let n = 0;
            for (let y = f.y; y < f.y + f.height; y += 2) {
                for (let x = f.x; x < f.x + f.width; x += 2) {
                    if (b.getAlphaPixel(x, y) > 0) n++;
                }
            }
            return n;
        };

        // V4: no protagonist on screen.
        const ps = spriteOf($gamePlayer);
        const playerShown = ps && ps.visible && ps.opacity > 0 && !$gamePlayer.isTransparent() && visiblePixels(ps) > 0;
        t.check("player_not_visible", !playerShown, playerShown ? `player drawn at (${ps.x},${ps.y}) with "${$gamePlayer.characterName()}"` : "");

        // Every event with an image whose cell is in view must actually be drawn there, with pixels.
        // One check per event name; events elsewhere in a big area are counted, not checked.
        const inView = ev => {
            const x = $gameMap.adjustX(ev._realX), y = $gameMap.adjustY(ev._realY);
            return x >= 0 && y >= 0 && x < $gameMap.screenTileX() && y < $gameMap.screenTileY();
        };
        const groups = new Map();
        for (const ev of $gameMap.events()) {
            if (!ev.characterName()) continue;
            const name = ev.event().name.replace(/\s+/g, "_");
            const group = groups.get(name) || { onScreen: 0, elsewhere: 0, problems: [], at: null };
            groups.set(name, group);
            if (!inView(ev)) {
                group.elsewhere++;
                continue;
            }
            group.onScreen++;
            const sp = spriteOf(ev);
            const problems = [];
            if (!sp) problems.push("no sprite");
            else {
                const g = sp.getGlobalPosition(); // real screen pixels (the map may be zoomed)
                group.at = group.at || `(${Math.round(g.x)},${Math.round(g.y)})`;
                if (!sp.bitmap || sp.bitmap.isError()) problems.push(`image "${ev.characterName()}" failed to load`);
                if (!sp.visible) problems.push("sprite.visible=false");
                if (sp.opacity === 0) problems.push("opacity 0");
                if (ev.isTransparent()) problems.push("event transparent");
                if (g.x < 0 || g.x > Graphics.width || g.y < 0 || g.y > Graphics.height + 200) problems.push(`drawn off screen at (${Math.round(g.x)},${Math.round(g.y)})`);
                if (visiblePixels(sp) === 0) problems.push("frame has no opaque pixels");
            }
            if (problems.length) group.problems.push(`event ${ev.eventId()} at (${ev.x},${ev.y}): ${problems.join("; ")}`);
        }
        for (const [name, group] of groups) {
            if (group.onScreen === 0) continue;
            const elsewhere = group.elsewhere ? `; ${group.elsewhere} more elsewhere in the area` : "";
            t.check(`event_drawn.${name}`, group.problems.length === 0,
                group.problems.length ? `${group.problems.length} of ${group.onScreen} in view not drawn; first: ${group.problems[0]}`
                    : `${group.onScreen} in view drawn${group.onScreen === 1 ? ` at screen ${group.at}` : ""}${elsewhere}`);
        }

        // ENGINE_RULES §2: simulation state must be in the save file.
        const contents = DataManager.makeSaveContents();
        let json = null;
        try {
            json = JsonEx.stringify(contents);
        } catch (e) {
            // Find which top-level save key breaks serialization.
            const bad = Object.keys(contents).filter(k => { try { JsonEx.stringify(contents[k]); return false; } catch (_) { return true; } });
            t.check("save_serializes", false, `${e.message}; failing save keys: ${bad.join(", ")}`);
        }
        if (json !== null) {
            t.check("save_serializes", true);
            const hasColony = /colonist/i.test(json);
            t.check("colony_state_in_save", hasColony, hasColony ? "" : `save keys: ${Object.keys(contents).join(", ")}; no colonist data`);
        }

        t.screenshot("map");
        await t.waitFrames(120);
        t.check("no_errors", Test.errors.length === 0, Test.errors.length ? `${Test.errors.length} error(s), first: ${Test.errors[0]}` : "none in first ~3 s on map");
    });

    // Frame-time measurement (ENGINE_RULES §6). Run on its own: --uf-test=perf
    Test.suite("perf", async t => {
        const seconds = 30;
        const times = [];
        let last = performance.now();
        const end = last + seconds * 1000;
        await t.waitUntil(() => {
            const now = performance.now();
            times.push(now - last);
            last = now;
            return now >= end;
        }, seconds * 1000 + 10000, "perf sample window");
        times.shift();
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const sorted = times.slice().sort((a, b) => a - b);
        const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))].toFixed(1);
        const worst = sorted[sorted.length - 1];
        const slow = times.filter(ms => ms > 50).length;
        const units = $gameMap.events().filter(e => e.characterName()).length;
        const map = `${$gameMap.width()}x${$gameMap.height()} map`;
        t.check("avg_frame_under_17ms", avg <= 17.0,
            `avg ${avg.toFixed(2)} ms, p50 ${pct(0.5)}, p99 ${pct(0.99)}, worst ${worst.toFixed(1)} ms; ${times.length} frames over ${seconds} s; ${map}, ${units} drawn events`);
        t.check("worst_frame_under_50ms", worst < 50, `worst ${worst.toFixed(1)} ms; ${slow} frame(s) over 50 ms`);
    }, { isDefault: false });
})();
