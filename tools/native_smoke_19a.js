#!/usr/bin/env node
"use strict";

/**
 * tools/native_smoke_19a.js
 *
 * Runs the DEUS-TSK-FABLE-19A smoke gate (tools/smoke_19a_playtest.js) in the real NW.js runtime in Playtest mode (the
 * "test" argument the editor's F5 passes), driven over the DevTools protocol instead of by hand, on a SNAPSHOT copy of
 * game/ (docs/systems/UF_Test.md, "Running it"). It changes no project file. The literal editor F5 run stays a person's.
 *
 *   New Game through the title's own setup window and Embark (fixed seed) -> checker start() (Z0, an ordinary ground area
 *   80 cells away) -> prepare() (level -1, fixture) -> dig() -> save() -> reload() through the game's Load screen ->
 *   verify() -> nw.exe killed and started again on the same profile -> the slot loaded from the title's Load screen ->
 *   verify() in the fresh process (every baseline regenerated from the seed) -> cleanup(). A screenshot after each step.
 *
 * Usage: node tools/native_smoke_19a.js --game <snapshot game folder> [--out <dir>] [--seed 20260923]
 *                                       [--provoke tamper|nodig|error|gen] [--no-cold]
 *   --provoke: negative controls; each must produce exactly its expected FAIL lines (listed in PROVOKE below).
 * The repository's own game/ folder is refused (its save/ holds the user's saves).
 * Exit: 0 every checker line PASS, no page exception or console.error, no missing file other than the optional
 * img/characters/*.json sprite sidecars (or, with --provoke, exactly the expected FAILs); 1 otherwise; 2 harness problem.
 */

const fs = require("fs");
const os = require("os");
const net = require("net");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const LIVE = path.resolve(__dirname, "..", "game");
const gameArg = arg("game", "");
if (!gameArg) { console.log("HARNESS --game <snapshot game folder> is required"); process.exit(2); }
const gameDir = path.resolve(gameArg);
if (gameDir.toLowerCase() === LIVE.toLowerCase()) { console.log(`HARNESS refusing the project's own game folder (${LIVE}): use a snapshot copy`); process.exit(2); }
const provoke = arg("provoke", "");
const PROVOKE = {
    tamper: ["nearby_untouched", "persisted_hp", "persisted_strata", "tunnel_walkable"],   // the save loses the smoke's -1 records, one cell next to the tunnel changes
    nodig: ["damage_geometry", "map_repainted", "partial_hp", "persisted_strata", "tunnel_walkable", "walkability"],   // the damage is 0
    error: ["no_console_errors"],   // one console.error after the paste
    gen: ["untouched_deterministic"]   // the save says level -2 was made by another generator
};
if (provoke && !PROVOKE[provoke]) { console.log(`HARNESS unknown --provoke ${provoke} (${Object.keys(PROVOKE).join(", ")})`); process.exit(2); }
const cold = !argv.includes("--no-cold") && !provoke;
const seed = Number(arg("seed", "20260923"));
const tag = provoke ? `provoke_${provoke}` : "gate";
const outDir = path.resolve(arg("out", path.join(gameDir, "test_output")));
fs.mkdirSync(outDir, { recursive: true });
const checker = fs.readFileSync(path.join(__dirname, "smoke_19a_playtest.js"), "utf8");
const profile = path.join(os.tmpdir(), `deus_native_smoke_${process.pid}_${Date.now()}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const OPTIONAL_MISSING = /^img\/characters\/[^/]+\.json$/;   // DEUS_Anim probes every sheet for a sidecar; most have none

let child = null, ws = null, finishing = false;
const consoleErrors = [], missing = [];
function killChild() {
    const c = child;
    child = null;
    if (c && c.exitCode === null && c.pid) { try { execFileSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { stdio: "ignore" }); } catch (e) { /* gone */ } }
}
function stop(code, msg) {
    if (finishing) return;
    finishing = true;
    if (msg) log(msg);
    try { if (ws) ws.close(); } catch (e) { /* closed */ }
    killChild();
    setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ } process.exit(code); }, 800);
}
process.on("exit", () => killChild());
process.on("SIGINT", () => stop(2, "HARNESS interrupted"));
const watchdog = setTimeout(() => safeStop(2, "HARNESS no result after 600 s"), 600000);

const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });

// One DevTools session on the game started here.
async function launch() {
    const port = await freePort();
    child = spawn(NW, [gameDir, "test", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
        "--disable-features=CalculateNativeWinOcclusion"], { cwd: gameDir, stdio: "ignore" });
    const mine = child;
    mine.on("exit", code => { if (child === mine) { child = null; if (!finishing) consoleErrors.push(`nw.exe exited by itself (code ${code})`); } });
    mine.on("error", e => { if (child === mine) child = null; consoleErrors.push(`nw.exe failed to start: ${e.message}`); });
    log(`launched nw.exe ${gameDir} test (Playtest mode), DevTools port ${port}, pid ${mine.pid}`);
    let target = null;
    for (let k = 0; k < 120 && !target && child === mine; k++) {
        await sleep(500);
        try {
            const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
            target = list.find(t => t.type === "page" && /index\.html/.test(t.url)) || null;
        } catch (e) { /* not up yet */ }
    }
    if (!target) throw new Error("no DevTools page target on the game started here");
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("DevTools socket error")); });
    let nextId = 1;
    const pending = new Map();
    ws.onmessage = ev => {
        const m = JSON.parse(ev.data);
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
        if (m.method === "Runtime.exceptionThrown") consoleErrors.push(`exception: ${(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text}`.slice(0, 400));
        if (m.method === "Runtime.consoleAPICalled") {
            const first = String(m.params.args[0] && m.params.args[0].value);
            if (m.params.type === "error" && !(provoke === "error" && /SMOKE_PROVOKED_ERROR/.test(first))) consoleErrors.push(`console.error: ${m.params.args.map(a => a.value !== undefined ? a.value : a.description).join(" ")}`.slice(0, 400));
            if (/^\[smoke19a\] (PASS|FAIL|KNOWN)/.test(first)) log(`  ${first}`);
        }
        if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
            if (/Failed to load resource/.test(m.params.entry.text)) missing.push(decodeURIComponent(String(m.params.entry.url || "?")).replace(/^.*?\/(img|audio|data|fonts|js|effects|movies)\//, "$1/"));
            else consoleErrors.push(`log: ${m.params.entry.text}`.slice(0, 400));
        }
    };
    const send = (method, params = {}) => new Promise((res, rej) => {
        if (!ws || ws.readyState !== 1) return rej(new Error("DevTools socket closed"));
        const id = nextId++;
        pending.set(id, res);
        ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression, awaitPromise = true) => {
        const r = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true, userGesture: true });
        if (r.result && r.result.exceptionDetails) throw new Error(`page: ${(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description) || r.result.exceptionDetails.text}`);
        return r.result && r.result.result ? r.result.result.value : undefined;
    };
    const waitFor = async (expression, ms, what) => {
        const t0 = Date.now();
        while (Date.now() - t0 < ms) { try { if (await evaluate(expression, false)) return; } catch (e) { if (/socket closed/.test(e.message)) throw e; } await sleep(250); }
        throw new Error(`timed out after ${ms} ms waiting for ${what}`);
    };
    const shot = async name => {
        const r = await send("Page.captureScreenshot", { format: "png" });
        if (!r.result || !r.result.data) throw new Error(`screenshot ${name} failed`);
        const file = path.join(outDir, `native_smoke_19a.${tag}.${name}.png`);
        fs.writeFileSync(file, Buffer.from(r.result.data, "base64"));
        log(`SHOT ${file}`);
    };
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Page.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });   // RMMZ pauses a window without focus
    await waitFor("typeof SceneManager !== 'undefined' && SceneManager._scene instanceof Scene_Title && SceneManager._scene.isStarted() && ImageManager.isReady()", 90000, "the title");
    const mode = await evaluate("Utils.isOptionValid('test')", false);
    if (mode !== true) throw new Error("the game is not in Playtest mode (Utils.isOptionValid('test') is false)");
    return { evaluate, waitFor, shot };
}

let page = null;
async function safeStop(code, msg) {
    if (page && !finishing) { try { await Promise.race([page.evaluate("window.__smoke19a ? __smoke19a.cleanup() : false"), sleep(5000)]); } catch (e) { /* page gone */ } }
    stop(code, msg);
}

(async () => {
    try {
        page = await launch();
        await page.shot("title");
        // New Game through the title's setup window and its Embark handler, with the seed typed in.
        await page.evaluate(`(() => { const s = SceneManager._scene; s.commandNewGame(); s._newGameSetupWindow._seedInput = "${seed}"; s.onNewGameEmbark(); return true; })()`, false);
        await page.waitFor("SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring() && ImageManager.isReady()", 240000, "the New Game map");
        const setup = await page.evaluate("JSON.stringify(Object.assign({}, UF.NewGameSetup, { worldSeed: UF.World.state.seed }))", false);
        log(`New Game through the title's Embark: ${setup}`);
        await sleep(2000);
        await page.shot("ground_new_game");
        await page.evaluate(checker, false);
        const start = await page.evaluate("__smoke19a.start()");
        if (!start) throw new Error("checker start() failed");
        await page.shot("ground_ordinary_area");
        if (provoke === "error") await page.evaluate("console.error('SMOKE_PROVOKED_ERROR (--provoke error)'); true", false);
        if (!(await page.evaluate("__smoke19a.prepare()"))) throw new Error("checker prepare() failed");
        await page.shot("minus1_before_dig");
        await page.evaluate(provoke === "nodig" ? "__smoke19a.dig({ damage: 0 })" : "__smoke19a.dig()");
        await page.shot("minus1_after_dig");
        const saved = await page.evaluate("__smoke19a.save()");
        if (!saved) throw new Error("checker save() failed");
        if (provoke === "tamper" || provoke === "gen") {
            const t = await page.evaluate(`(async () => {
                const e = __smoke19a.expect, name = DataManager.makeSavename(e.slot);
                const c = await StorageManager.loadObject(name);
                if (${JSON.stringify(provoke)} === "gen") { c.ufWorld.levels["-2"].gen = c.ufWorld.levels["-2"].gen === 2 ? 3 : 2; await StorageManager.saveObject(name, c); return "slot " + e.slot + ": levels[-2].gen set to " + c.ufWorld.levels["-2"].gen; }
                // A full record (connector 00, five materials, five HP bytes) that differs from the cell's own strata.
                const key = e.area.x + "," + e.area.y, cc = e.near.find(x => x.z === -1);
                const full = m => "00" + m.repeat(5) + "ff".repeat(5);
                const rec = cc.key.startsWith("1,1,1,1,1|") ? full("02") : full("01");
                c.ufWorld.levels["-1"].strata = {};
                c.ufWorld.levels["-1"].strata[key] = { [cc.y * c.ufWorld.size + cc.x]: rec };
                await StorageManager.saveObject(name, c);
                return "slot " + e.slot + ": levels[-1].strata replaced by one changed cell at (" + cc.x + "," + cc.y + ") next to the tunnel (was " + cc.key + ", now " + rec + ")";
            })()`);
            log(`PROVOKE ${t}`);
        }
        await page.evaluate("__smoke19a.reload()");
        const inPage = await page.evaluate("__smoke19a.verify()");
        await page.shot("minus1_after_reload");
        let coldRes = null;
        if (cold) {
            // A fresh process on the same profile: the title, then the smoke's slot through the Load screen.
            const expectJson = JSON.stringify(inPage.expect || saved);
            const exp = await page.evaluate("JSON.stringify(__smoke19a.expect)", false);
            await sleep(1500);   // global info and localStorage written
            try { ws.close(); } catch (e) { /* closed */ }
            killChild();
            await sleep(1500);
            page = await launch();
            await page.evaluate(`window.__smoke19aExpect = ${exp || expectJson}; true`, false);
            const slot = await page.evaluate("window.__smoke19aExpect.slot", false);
            await page.evaluate(`(() => { SceneManager.push(Scene_Load); return true; })()`, false);
            await page.waitFor("SceneManager._scene instanceof Scene_Load && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging()", 20000, "the Load screen");
            await page.evaluate(`(() => { const x = DataManager.extractSaveContents; DataManager.extractSaveContents = function(c) { DataManager.extractSaveContents = x; x.call(this, c); UF.Time.pause(); }; SceneManager._scene.executeLoad(${slot}); return true; })()`, false);
            await page.waitFor("SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring() && ImageManager.isReady()", 240000, "the loaded game's map in the fresh process");
            await sleep(2000);
            await page.evaluate(checker, false);
            coldRes = await page.evaluate("__smoke19a.verify()");
            await page.shot("cold_minus1_after_load");
        }
        const removed = await page.evaluate("__smoke19a.cleanup()");
        const lines = [...(inPage.lines || []), ...(coldRes ? coldRes.lines.map(l => l.replace(/^(PASS|FAIL|KNOWN) /, "$1 cold.")) : [])];
        const knownLines = lines.filter(l => l.startsWith("KNOWN"));
        const failed = lines.filter(l => l.startsWith("FAIL")).map(l => l.split(" ")[1].replace(/^cold\./, "")).filter((v, i, a) => a.indexOf(v) === i).sort();
        const required = [...new Set(missing)].filter(m => !OPTIONAL_MISSING.test(m));
        log(`CHECKER ${lines.length - lines.filter(l => l.startsWith("FAIL")).length - knownLines.length} passed, ${lines.filter(l => l.startsWith("FAIL")).length} failed, ${knownLines.length} known${coldRes ? " (same page + fresh process)" : ""}; smoke save removed ${removed}`);
        for (const k of knownLines) log(`KNOWN (measured before 19A too, not failed): ${k.slice(6, 260)}`);
        log(`CONSOLE errors seen by DevTools (exceptions, console.error, error logs): ${consoleErrors.length}${consoleErrors.length ? "\n  " + consoleErrors.slice(0, 8).join("\n  ") : ""}`);
        log(`MISSING files: ${missing.length} requests, ${new Set(missing).size} files; optional sprite sidecars (img/characters/*.json) ${[...new Set(missing)].filter(m => OPTIONAL_MISSING.test(m)).length}, others ${required.length}${required.length ? "\n  " + required.slice(0, 20).join("\n  ") : ""}`);
        let code;
        if (provoke) {
            const want = PROVOKE[provoke].slice().sort().join(",");   // KNOWN lines are neither required nor counted
            code = failed.join(",") === want && consoleErrors.length === 0 && required.length === 0 ? 0 : 1;
            log(`RESULT: --provoke ${provoke} ${code === 0 ? "caught as expected" : "NOT as expected"} (failed: ${failed.join(",") || "none"}; want ${want})`);
        } else {
            code = failed.length === 0 && consoleErrors.length === 0 && required.length === 0 ? 0 : 1;
            log(`RESULT: ${code === 0 ? "PASS" : "FAIL"} (checker lines ${lines.length - failed.length}/${lines.length}${failed.length ? `, failed ${failed.join(",")}` : ""}; console errors ${consoleErrors.length}; missing files other than sidecars ${required.length}). ` +
                `The screenshots are for a person: the ordinary area, the rock before the dig, the corridor after it, after the reload${cold ? " and in the fresh process" : ""}.${knownLines.length ? ` ${knownLines.length} KNOWN line(s) listed above.` : ""}`);
        }
        clearTimeout(watchdog);
        stop(code);
    } catch (e) {
        try { if (page) await page.shot("on_failure"); } catch (err) { /* ignore */ }
        log(`CONSOLE errors: ${consoleErrors.slice(0, 8).join(" | ") || "none"}`);
        await safeStop(2, `HARNESS ${e.message}`);
    }
})();
