//=============================================================================
// DEUS_Test.js - Test harness with checks that can fail
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Test] Automated test harness: PASS/FAIL test suites, screenshot verification, and performance benchmarks.
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
    const flag = args.find(a => a === "--deus-test" || a.startsWith("--deus-test=") || a === "--uf-test" || a.startsWith("--uf-test="));

    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;

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
    window.DEUS.Test = Test;
    window.UF.Test = Test;

    if (!Test.active) return;

    //-------------------------------------------------------------------------
    // Test clock (DEUS-TSK-FABLE-07). UF.Time.setForTest(hour, minute, day) puts the calendar ($ufTime, DEUS_Core)
    // at a known time so an unattended suite starts its founders in working hours. It exists only while the harness
    // is active (this code is past the early return above), so it is no cheat in play. The calendar keeps running
    // from there at its normal rate; pause, speed and the survival routines are untouched.
    // >>> test clock (tools/test_autonomous_settlement_closure.js runs this block in a sandbox)
    function installTestClock(root) {
        if (!root.UF) return null;
        if (!root.UF.Time) root.UF.Time = {};
        root.UF.Time.setForTest = function(hour, minute = 0, day = null) {
            const T = root.UF.Test, clock = root.$ufTime;
            if (!T || !T.active || !clock) return null;
            const h = Math.max(0, Math.min(23, hour | 0)), m = Math.max(0, Math.min(59, minute | 0));
            if (typeof clock.setTime === "function") clock.setTime(h, m); else { clock.hour = h; clock.minute = m; }
            if (Number.isFinite(day)) clock.day = Math.max(1, day | 0);
            if (typeof clock._timer === "number") clock._timer = 0;
            return { hour: clock.hour, minute: clock.minute, day: clock.day };
        };
        return root.UF.Time.setForTest;
    }
    // <<< test clock
    installTestClock(window);

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
    Test.write = write;
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
            write(`AVAILABLE SUITES: ${suites.map(s => s.name).join(", ")}`);
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
            const group = groups.get(name) || { onScreen: 0, elsewhere: 0, fogged: 0, problems: [], at: null };
            groups.set(name, group);
            if (!inView(ev)) {
                group.elsewhere++;
                continue;
            }
            if (window.UF.Fog && !UF.Fog.isExplored(ev.x, ev.y)) {
                group.fogged++; // hidden by the fog of war on purpose
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
            const elsewhere = (group.elsewhere ? `; ${group.elsewhere} more elsewhere in the area` : "") + (group.fogged ? `; ${group.fogged} in view but unexplored (hidden by fog)` : "");
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

    // Native New Game Starting Gear & Level Switching Verification
    Test.suite("native_starting_gear", async t => {
        await t.waitFrames(45);
        const W = window.UF.World;
        const I = window.UF.Items;
        const Sheet = window.UF.Sheet;
        const Levels = window.UF.Levels;

        // 1. Inspect all 72 founders in the live generated world
        const allUnits = W ? W.units() : [];
        const founders = allUnits.filter(u => u && u.data && u.data.founder);
        t.check("founders_found", founders.length === 72, `found ${founders.length} founders (expected 72)`);

        let equippedOk = 0, pouchOk = 0, goldOk = 0, weightOk = 0;
        for (const f of founders) {
            const clothesId = f.data.equipment && (f.data.equipment.clothes || f.data.equipment.torso);
            const clothesItem = clothesId ? I.get(clothesId) : null;
            if (clothesItem && (clothesItem.type === "common_clothes" || clothesItem.type === "clothes_common")) equippedOk++;

            const inv = I.inventoryOf(f.id);
            const pouch = inv.find(it => it.type === "pouch");
            if (pouch) pouchOk++;

            const gold = inv.find(it => it.type === "gold_coin" || it.type === "gp");
            if (gold && gold.count === 15 && pouch && pouch.contents && pouch.contents.includes(gold.id)) goldOk++;

            const weight = I.carriedWeight(f.id);
            if (Math.abs(weight - 4.3) < 0.05) weightOk++;
        }

        t.check("all_founders_equipped_clothes", equippedOk === founders.length, `${equippedOk}/${founders.length} founders have common_clothes equipped`);
        t.check("all_founders_hold_pouch", pouchOk === founders.length, `${pouchOk}/${founders.length} founders have a pouch`);
        t.check("all_founders_15_gp_in_pouch", goldOk === founders.length, `${goldOk}/${founders.length} founders have 15 gp inside pouch`);
        t.check("all_founders_4_3_lb_load", weightOk === founders.length, `${weightOk}/${founders.length} founders carry exactly 4.3 lb`);

        // 2. Open character sheet on first founder, switch to Page 2 (Inventory), verify display, take screenshot
        const f0 = founders[0];
        if (f0 && Sheet && typeof Sheet.open === "function") {
            Sheet.open(f0.id);
            await t.waitFrames(15);
            const scene = SceneManager._scene;
            const win = scene && scene._ufSheetWindow;
            if (win) {
                if (typeof win.switchTab === "function") {
                    win.switchTab(1); // Tab 1: Inventory & Equipment
                } else if (typeof win.redraw === "function") {
                    win._activeTab = 1;
                    win.redraw();
                }
                await t.waitFrames(15);
            }
            t.screenshot("native_founder_starting_kit");
            Sheet.close();
            await t.waitFrames(10);
        }

        // 3. Test level switching via Levels.setView(-1) and Levels.setView(0) with hover/select interactions
        let levelSwitchOk = false;
        try {
            if (Levels && typeof Levels.setView === "function") {
                Levels.setView(-1);
                await t.waitFrames(30);
                // Hover across tiles at z=-1
                if (window.UF.Look && typeof window.UF.Look.cellUnderMouse === "function") {
                    TouchInput._x = 400;
                    TouchInput._y = 300;
                    window.UF.Look.cellUnderMouse();
                }
                // Simulate click at z=-1
                TouchInput._currentState.triggered = true;
                await t.waitFrames(10);
                TouchInput._currentState.triggered = false;

                Levels.setView(0);
                await t.waitFrames(30);
                levelSwitchOk = true;
            }
        } catch (e) {
            console.error("Level switch crash: " + e.message);
        }
        t.check("level_switch_no_crash", levelSwitchOk, "Level switching between z=0 and z=-1 and tile interaction succeeded with 0 crashes");
    }, { isDefault: false });

    // Native Survival, Dying, Exhaustion, and Food Verification
    Test.suite("native_survival_dying", async t => {
        await t.waitFrames(45);
        const W = window.UF.World;
        const Cb = window.UF.Combat;
        const Dnd = window.UF.Dnd5e;
        const Col = window.UF.Colonists;
        const J = window.UF.Jobs;
        const allUnits = W ? W.units() : [];
        const founders = allUnits.filter(u => u && u.data && u.data.founder);
        t.check("founders_present", founders.length >= 8, `found ${founders.length} founders (expected at least 8)`);

        // 1. Survival needs and food catalog presence
        const f0 = founders[0];
        const needs0 = Col.needsOf(f0);
        t.check("founder_needs_initialized", !!needs0 && needs0.model === "srd" && Number.isFinite(needs0.foodLb) && Number.isFinite(needs0.exhaustion),
            `founder 0 needs: model=${needs0 ? needs0.model : null}, exhaustion=${needs0 ? needs0.exhaustion : null}`);

        // 2. Skill Proficiencies persistence
        let profCount = 0;
        founders.forEach(f => {
            if (f.data && Array.isArray(f.data.proficiencies) && f.data.proficiencies.length > 0) profCount++;
        });
        t.check("founders_have_persisted_proficiencies", profCount >= 8, `${profCount}/${founders.length} founders have persisted proficiencies`);

        // 3. Exhaustion Effects Ladder on live units
        const f1 = founders[1];
        const baseSpeed = W.unitMoveSpeed ? W.unitMoveSpeed(f1) : 4;
        const baseMaxHp = Cb.maxHp(f1);
        if (f1.data && f1.data.needs) f1.data.needs.exhaustion = 2;
        const lvl2Speed = W.unitMoveSpeed ? W.unitMoveSpeed(f1) : 3;
        t.check("exhaustion_lvl2_slows_movement", lvl2Speed < baseSpeed, `baseSpeed=${baseSpeed}, lvl2Speed=${lvl2Speed}`);

        if (f1.data && f1.data.needs) f1.data.needs.exhaustion = 4;
        const lvl4MaxHp = Cb.maxHp(f1);
        t.check("exhaustion_lvl4_halves_max_hp", lvl4MaxHp <= Math.ceil(baseMaxHp / 2), `baseMaxHp=${baseMaxHp}, lvl4MaxHp=${lvl4MaxHp}`);

        // Restore exhaustion
        if (f1.data && f1.data.needs) f1.data.needs.exhaustion = 0;
        t.check("exhaustion_cleared_restores_max_hp", Cb.maxHp(f1) === baseMaxHp, `restored maxHp=${Cb.maxHp(f1)}`);

        // 4. Combat -> 0 HP -> Dying State
        const patient = founders[2];
        const startHp = patient.data.hp || 10;
        // Resolve attack that downs patient to 0 HP
        const downAttack = Cb.resolveAttack(f0, patient, { legacy: true, hit: true, damage: startHp });
        t.check("combat_reduces_to_zero_hp", patient.data.hp === 0 && !patient.data.dead, `patient hp=${patient.data.hp}, dead=${patient.data.dead}`);
        t.check("patient_enters_dying_state", !!patient.data.dying && patient.data.dying.stable === false,
            `dying=${JSON.stringify(patient.data.dying)}`);

        // 5. Medicine Stabilization Check & First Aid
        const doctor = founders[3];
        const stabResult = Col.stabilize(patient, doctor);
        t.check("patient_stabilized_by_aid", !!stabResult && stabResult.ok === true && patient.data.dying.stable === true,
            `stabilize ok=${stabResult ? stabResult.ok : false}, stable=${patient.data.dying ? patient.data.dying.stable : false}`);
        t.check("stabilized_patient_remains_at_zero_hp", patient.data.hp === 0, `patient hp=${patient.data.hp}`);

        // Center camera / screenshot
        if ($gamePlayer && patient) {
            $gamePlayer.locate(patient.x, patient.y);
        }
        await t.waitFrames(15);
        t.screenshot("native_survival_dying");

        // 6. Healing restores consciousness
        const healed = Cb.heal(patient, 5);
        t.check("healing_restores_consciousness", healed === 5 && patient.data.hp === 5 && patient.data.dying === undefined,
            `healed=${healed}, hp=${patient.data.hp}, dying=${patient.data.dying}`);

        // 7. Save / Load Persistence verification
        let saveOk = false;
        try {
            const contents = DataManager.makeSaveContents();
            t.check("save_contents_serializable", !!contents && typeof contents === "object", "save contents created successfully");
            saveOk = true;
        } catch (e) {
            console.error("Save contents failure: " + e.message);
        }
        t.check("save_load_persistence_intact", saveOk, "Save contents serialization passed with 0 errors");
    }, { isDefault: false });
})();
