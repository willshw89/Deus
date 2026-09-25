#!/usr/bin/env node
"use strict";

/**
 * tools/native_smoke_19a.js
 *
 * Runs the DEUS-TSK-FABLE-19A smoke gate (tools/smoke_19a_playtest.js) in the real NW.js runtime in Playtest mode (the
 * "test" argument the editor's F5 passes), driven over the DevTools protocol instead of by hand: New Game, the checker's
 * run() / reload() / verify(), a screenshot after each step, and every console error the page logged (the F8 console).
 * It changes no project file; the game folder's save/ gets one slot (removed at the end with the checker's cleanup()).
 * Use it on a snapshot copy of game/ (docs/systems/UF_Test.md, "Running it"); the literal editor F5 run stays a person's.
 *
 * Usage: node tools/native_smoke_19a.js --game <game folder> [--out <dir>] [--seed 20260923] [--tamper]
 *   --tamper: a negative control. Between run() and reload() the saved file loses levels["-1"].strata and gains one
 *   changed control cell, so verify() must print FAIL for persisted_strata, persisted_hp and untouched_deterministic.
 * Exit: 0 every checker line PASS (without --tamper) or the three expected FAILs (with --tamper); 1 otherwise; 2 harness.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const gameDir = path.resolve(arg("game", path.join(__dirname, "..", "game")));
const outDir = path.resolve(arg("out", path.join(gameDir, "test_output")));
const seed = Number(arg("seed", "20260923"));
const tamper = process.argv.includes("--tamper");
const port = 9300 + (process.pid % 500);
const checker = fs.readFileSync(path.join(__dirname, "smoke_19a_playtest.js"), "utf8");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
fs.mkdirSync(outDir, { recursive: true });

let child = null;
function stop(code, msg) {
    if (msg) log(msg);
    try { if (child && child.pid) execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" }); } catch (e) { /* gone */ }
    process.exit(code);
}
setTimeout(() => stop(2, "HARNESS no result after 300 s"), 300000);

(async () => {
    const profile = path.join(os.tmpdir(), `deus_native_smoke_${process.pid}`);
    child = spawn(NW, [gameDir, "test", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
        "--disable-features=CalculateNativeWinOcclusion"], { stdio: "ignore" });
    log(`launched nw.exe ${gameDir} test (Playtest mode), DevTools port ${port}, pid ${child.pid}`);

    // The game's page target.
    let target = null;
    for (let k = 0; k < 120 && !target; k++) {
        await sleep(500);
        try {
            const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
            target = list.find(t => t.type === "page" && /index\.html/.test(t.url)) || null;
        } catch (e) { /* not up yet */ }
    }
    if (!target) return stop(2, "HARNESS no DevTools page target");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let nextId = 1;
    const pending = new Map(), consoleErrors = [];
    ws.onmessage = ev => {
        const m = JSON.parse(ev.data);
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
        if (m.method === "Runtime.exceptionThrown") consoleErrors.push(`exception: ${m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text}`.slice(0, 400));
        if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push(`console.error: ${m.params.args.map(a => a.value !== undefined ? a.value : a.description).join(" ")}`.slice(0, 400));
        if (m.method === "Runtime.consoleAPICalled" && /\[smoke19a\]/.test(String(m.params.args[0] && m.params.args[0].value))) log(`  ${m.params.args[0].value}`);
        if (m.method === "Log.entryAdded" && m.params.entry.level === "error") consoleErrors.push(`log: ${m.params.entry.text}`.slice(0, 400));
    };
    const send = (method, params = {}) => new Promise(res => { const id = nextId++; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
    const evaluate = async (expression, awaitPromise = true) => {
        const r = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true, userGesture: true });
        if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text);
        return r.result && r.result.result ? r.result.result.value : undefined;
    };
    const waitFor = async (expression, ms, what) => {
        const t0 = Date.now();
        while (Date.now() - t0 < ms) { try { if (await evaluate(expression, false)) return; } catch (e) { /* page not ready */ } await sleep(250); }
        throw new Error(`timed out after ${ms} ms waiting for ${what}`);
    };
    const shot = async name => {
        const r = await send("Page.captureScreenshot", { format: "png" });
        const file = path.join(outDir, `native_smoke_19a.${name}.png`);
        fs.writeFileSync(file, Buffer.from(r.result.data, "base64"));
        log(`SHOT ${file}`);
    };
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Page.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });   // RMMZ pauses a window without focus

    try {
        await waitFor("typeof SceneManager !== 'undefined' && !!SceneManager._scene && !(SceneManager._scene instanceof Scene_Boot) && ImageManager.isReady()", 60000, "the title");
        const title = await evaluate("SceneManager._scene.constructor.name + (Utils.isOptionValid('test') ? ' (Playtest)' : ' (not Playtest)')", false);
        log(`scene after boot: ${title}`);
        await shot("title");
        // New Game with a fixed seed (the title's own command would ask for setup choices).
        await evaluate(`window.UF = window.UF || {}; UF.NewGameSetup = Object.assign(UF.NewGameSetup || {}, { seed: ${seed} }); DataManager.setupNewGame(); SceneManager.goto(Scene_Map); true`, false);
        await waitFor("SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && ImageManager.isReady()", 180000, "the New Game map");
        await sleep(3000);
        await shot("ground_new_game");
        await evaluate(checker, false);
        const run = await evaluate("__smoke19a.run()");
        await sleep(1000);
        await shot("minus1_tunnel_dug");
        if (tamper) {
            const t = await evaluate(`(async () => {
                const e = __smoke19a.expect, name = DataManager.makeSavename(e.slot);
                const c = await StorageManager.loadObject(name);
                c.ufWorld.levels["-1"].strata = {};
                const cc = e.control.cells.find(x => x.z === -1), key = e.area.x + "," + e.area.y;
                c.ufWorld.levels["-1"].strata[key] = { [cc.y * c.ufWorld.size + cc.x]: "0000000000000000000000" };
                await StorageManager.saveObject(name, c);
                return "slot " + e.slot + ": levels[-1].strata replaced by one all-air control cell (" + cc.x + "," + cc.y + ")";
            })()`);
            log(`TAMPER ${t}`);
        }
        await evaluate("__smoke19a.reload()");
        const res = await evaluate("__smoke19a.verify()");
        await sleep(1000);
        await shot("minus1_after_reload");
        await evaluate("__smoke19a.cleanup()");
        const lines = res.lines;
        log(`CHECKER ${res.passed} passed, ${res.failed} failed`);
        log(`CONSOLE errors seen by DevTools during the whole run: ${consoleErrors.length}${consoleErrors.length ? "\n  " + consoleErrors.slice(0, 8).join("\n  ") : ""}`);
        let code;
        if (tamper) {
            const failed = lines.filter(l => l.startsWith("FAIL")).map(l => l.split(" ")[1]).sort().join(",");
            code = failed === "persisted_hp,persisted_strata,untouched_deterministic" ? 0 : 1;
            log(`RESULT: tamper control ${code === 0 ? "caught" : "NOT caught as expected"} (failed: ${failed || "none"})`);
        } else {
            code = res.failed === 0 && consoleErrors.length === 0 ? 0 : 1;
            log(`RESULT: ${code === 0 ? "PASS" : "FAIL"} (checker ${res.passed}/${res.passed + res.failed}, console errors ${consoleErrors.length}; run() ${run.passed}/${run.passed + run.failed})`);
        }
        stop(code);
    } catch (e) {
        try { await shot("on_failure"); } catch (err) { /* ignore */ }
        log(`CONSOLE errors: ${consoleErrors.slice(0, 8).join(" | ")}`);
        stop(2, `HARNESS ${e.message}`);
    }
})();
