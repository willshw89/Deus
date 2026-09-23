#!/usr/bin/env node
// tools/srd_browser/nw_verify.js - verifies the SRD 5.1 catalogue browser in a real Chromium (NW.js).
//
//   node tools/srd_browser/nw_verify.js [--nw <nw.exe>] [--port 0] [--out tools/srd_browser/evidence] [--timeout 120000] [--keep]
//
// Starts serve.js on a free port, writes a throw-away NW.js app folder in the OS temp dir whose
// package.json has "main" = the served URL, "node-remote" for that origin, "inject_js_start" =
// nw_verify/hooks.js (error collectors) and "inject_js_end" = nw_verify/verify.js (the driver),
// then launches the NW.js that ships with RPG Maker MZ with its own --user-data-dir profile and a
// 1400x900 window. verify.js drives the real DOM, writes <out>/results.json plus three PNGs, and
// quits the app. This runner prints one PASS/FAIL line per scenario, adds its own checks (the
// server saw no failed request, the PNGs are real and small, the app quit by itself), prints a
// RESULT line and exits 1 on any failure or on a timeout. It only ever stops the child process it
// spawned, by pid (ENGINE_RULES section 6: never kill nw.exe processes you did not start).
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const serve = require("./serve.js");
const Q = require("./catalog_query.js");

const DEFAULT_NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const DEFAULT_OUT = path.join(__dirname, "evidence");
const DEFAULT_TIMEOUT = 120000;
const SCREENSHOTS = ["desktop_results_aboleth.png", "desktop_deck_table.png", "narrow_900.png"];
const MAX_PNG_BYTES = 400 * 1024;
const WINDOW = { width: 1400, height: 900 };

function usage() {
    return [
        "Usage: node tools/srd_browser/nw_verify.js [--nw <nw.exe>] [--port 0] [--out <dir>] [--timeout <ms>] [--keep]",
        "  --nw       NW.js executable (default: the one shipped with RPG Maker MZ)",
        "  --port     port for serve.js (default 0 = a free port)",
        "  --out      folder for results.json, the PNGs and the logs (default tools/srd_browser/evidence)",
        "  --timeout  overall limit in ms before the spawned nw.exe is stopped (default 120000)",
        "  --keep     keep the temporary app folder and profile for inspection",
        ""
    ].join("\n");
}
function parseArgs(argv) {
    const o = { nw: DEFAULT_NW, port: 0, out: DEFAULT_OUT, timeout: DEFAULT_TIMEOUT, keep: false, help: false };
    const a = argv.slice();
    while (a.length) {
        const x = a.shift();
        if (x === "--nw") o.nw = String(a.shift() || "");
        else if (x.startsWith("--nw=")) o.nw = x.slice(5);
        else if (x === "--port") o.port = parseInt(a.shift(), 10);
        else if (x.startsWith("--port=")) o.port = parseInt(x.slice(7), 10);
        else if (x === "--out") o.out = String(a.shift() || "");
        else if (x.startsWith("--out=")) o.out = x.slice(6);
        else if (x === "--timeout") o.timeout = parseInt(a.shift(), 10);
        else if (x.startsWith("--timeout=")) o.timeout = parseInt(x.slice(10), 10);
        else if (x === "--keep") o.keep = true;
        else if (x === "--help" || x === "-h") o.help = true;
        else throw new Error("unknown argument: " + x);
    }
    if (!Number.isInteger(o.port) || o.port < 0 || o.port > 65535) throw new Error("--port must be an integer 0-65535");
    if (!Number.isInteger(o.timeout) || o.timeout < 1000) throw new Error("--timeout must be at least 1000 ms");
    o.out = path.resolve(o.out);
    return o;
}

const lines = [];
function report(status, name, detail) {
    lines.push({ status, name, detail });
    process.stdout.write(status + " " + name + (detail ? " -- " + detail : "") + "\n");
}
function info(line) { process.stdout.write("INFO " + line + "\n"); }

/** Sum of entries[] across the catalogue files the served manifest names (an independent expectation for the page's count label). */
function expectedTotal(catalogDir) {
    const manifest = JSON.parse(fs.readFileSync(path.join(catalogDir, Q.MANIFEST_FILE), "utf8"));
    let total = 0;
    for (const f of Q.discoverFiles(manifest).files) {
        const json = JSON.parse(fs.readFileSync(path.join(catalogDir, f.file), "utf8"));
        const entries = Array.isArray(json) ? json : json.entries;
        if (!Array.isArray(entries)) throw new Error(f.file + " has no entries[]");
        total += entries.length;
    }
    return total;
}

/** serve.js's server with two additions: a request/status log and a GET /__nw_verify/log beacon the page can hit. */
function startServer(port, requests, beacons) {
    const server = serve.createServer({ quiet: true });
    const inner = server.listeners("request").slice();
    server.removeAllListeners("request");
    server.on("request", (req, res) => {
        const url = String(req.url || "");
        res.on("finish", () => requests.push({ method: req.method, url, status: res.statusCode }));
        if (url.startsWith("/__nw_verify/")) {
            let m = "";
            try { m = new URL(url, "http://127.0.0.1").searchParams.get("m") || ""; } catch (e) { /* ignore */ }
            beacons.push(m);
            info("page beacon: " + m);
            res.statusCode = 204;
            res.setHeader("Cache-Control", "no-store");
            res.end();
            return;
        }
        for (const fn of inner) fn.call(server, req, res);
    });
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            server.removeListener("error", reject);
            const p = server.address().port;
            resolve({ server, port: p, url: "http://127.0.0.1:" + p + "/", roots: server.srdRoots });
        });
    });
}

function writeAppFolder(url, out, total) {
    const appDir = fs.mkdtempSync(path.join(os.tmpdir(), "srd_nw_verify_app_"));
    for (const f of ["hooks.js", "verify.js"]) fs.copyFileSync(path.join(__dirname, "nw_verify", f), path.join(appDir, f));
    const manifest = {
        name: "srd-browser-nw-verify",
        version: "1.0.0",
        main: url,
        "node-remote": "http://127.0.0.1/*",           // match pattern: any port on the loopback host
        "inject_js_start": "hooks.js",
        "inject_js_end": "verify.js",
        window: { title: "SRD 5.1 browser - NW.js verification", width: WINDOW.width, height: WINDOW.height, position: "center", resizable: true, show: true },
        "chromium-args": "--force-device-scale-factor=1",
        srdVerify: { out, url, expectedTotal: total, startedAt: new Date().toISOString() }
    };
    fs.writeFileSync(path.join(appDir, "package.json"), JSON.stringify(manifest, null, 2));
    return appDir;
}

function pngInfo(file) {
    const b = fs.readFileSync(file);
    return { bytes: b.length, png: b.slice(0, 8).toString("hex") === "89504e470d0a1a0a", width: b.length >= 24 ? b.readUInt32BE(16) : 0, height: b.length >= 24 ? b.readUInt32BE(20) : 0 };
}
function tail(file, n) {
    try { return fs.readFileSync(file, "utf8").trim().split("\n").slice(-n).join("\n"); } catch (e) { return "(no " + path.basename(file) + ")"; }
}
function rmrf(p) { try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) { /* still locked; it is in the temp folder */ } }

async function main() {
    let opts;
    try { opts = parseArgs(process.argv.slice(2)); } catch (e) { process.stderr.write("nw_verify.js: " + e.message + "\n" + usage()); process.exit(2); }
    if (opts.help) { process.stdout.write(usage()); process.exit(0); }
    if (!fs.existsSync(opts.nw)) { process.stderr.write("nw_verify.js: NW.js not found at " + opts.nw + " (pass --nw <path to nw.exe>)\n"); process.exit(2); }

    fs.mkdirSync(opts.out, { recursive: true });
    const resultsFile = path.join(opts.out, "results.json");
    const pageLog = path.join(opts.out, "nw_verify.log");
    const stdioLog = path.join(opts.out, "nw_stdio.log");
    for (const f of [resultsFile, pageLog, stdioLog].concat(SCREENSHOTS.map(n => path.join(opts.out, n)))) fs.rmSync(f, { force: true });

    const requests = [], beacons = [];
    const srv = await startServer(opts.port, requests, beacons);
    let total;
    try { total = expectedTotal(srv.roots.catalog); } catch (e) { srv.server.close(); process.stderr.write("nw_verify.js: cannot read the catalogue at " + srv.roots.catalog + ": " + e.message + "\n"); process.exit(2); }
    info("serving " + srv.roots.catalog + " (" + total + " entries) at " + srv.url);

    const appDir = writeAppFolder(srv.url, opts.out, total);
    const profile = path.join(os.tmpdir(), "srd_nw_verify_profile_" + process.pid + "_" + Date.now());
    const flags = [
        appDir,
        "--user-data-dir=" + profile,
        "--force-device-scale-factor=1",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-features=CalculateNativeWinOcclusion",
        "--enable-logging=stderr",
        "--v=0"
    ];
    info("launching " + opts.nw + " with app folder " + appDir);
    const started = Date.now();
    const child = spawn(opts.nw, flags, { stdio: ["ignore", "pipe", "pipe"], windowsHide: false });
    const stdio = fs.createWriteStream(stdioLog);
    child.stdout.on("data", d => stdio.write(d));
    child.stderr.on("data", d => stdio.write(d));
    let exited = null;
    child.on("exit", (code, signal) => { exited = { code, signal, at: Date.now() }; });
    child.on("error", err => { exited = { code: null, signal: null, error: err.message, at: Date.now() }; });
    info("nw.exe pid " + child.pid + " (the only process this runner will ever stop)");

    // Wait for results.json (written atomically by verify.js) or the timeout.
    let results = null, timedOut = false;
    while (!results) {
        if (fs.existsSync(resultsFile)) {
            try { results = JSON.parse(fs.readFileSync(resultsFile, "utf8")); } catch (e) { results = null; }
        }
        if (results) break;
        if (exited) { await new Promise(r => setTimeout(r, 500)); if (fs.existsSync(resultsFile)) continue; break; }
        if (Date.now() - started > opts.timeout) { timedOut = true; break; }
        if (Date.now() - started > 20000 && !requests.some(r => r.url === "/")) {
            info("NW.js has not requested the page after 20 s; the remote main page may have been refused (see " + stdioLog + ")");
        }
        await new Promise(r => setTimeout(r, 250));
    }

    if (timedOut) {
        report("FAIL", "verification finished within " + opts.timeout + " ms", "timed out; stopping nw.exe pid " + child.pid);
        try { child.kill(); } catch (e) { /* already gone */ }
    }
    // Give the app a moment to quit by itself (verify.js calls nw.App.quit()).
    const quitDeadline = Date.now() + 10000;
    while (!exited && Date.now() < quitDeadline) await new Promise(r => setTimeout(r, 200));
    if (!exited) { try { child.kill(); } catch (e) { /* ignore */ } }
    await new Promise(r => setTimeout(r, 500));
    stdio.end();
    await new Promise(resolve => srv.server.close(resolve));

    // Report
    if (results) {
        info("approach: " + results.approach);
        info("engine: " + (results.versions ? "NW.js " + results.versions.nw + ", Chromium " + results.versions.chromium + ", Node " + results.versions.node : results.userAgent));
        info("window at start: " + JSON.stringify(results.window));
        for (const s of results.scenarios) report(s.pass ? "PASS" : "FAIL", s.id + " " + s.name, s.detail);
        if (results.fatal) report("FAIL", "verify.js ran every scenario", "fatal: " + String(results.fatal).split("\n")[0]);
        else if (results.scenarios.length < 10) report("FAIL", "verify.js ran every scenario", "only " + results.scenarios.length + " of 10 scenarios recorded");
    } else if (!timedOut) {
        report("FAIL", "verify.js wrote results.json", "nw.exe exited (" + JSON.stringify(exited) + ") without results; page log tail:\n" + tail(pageLog, 8) + "\nstdio tail:\n" + tail(stdioLog, 8) + (beacons.length ? "\nbeacons: " + beacons.join(" | ") : "\nno page beacons received (the injected scripts never ran)"));
    } else {
        info("page log tail:\n" + tail(pageLog, 12));
        info("stdio tail:\n" + tail(stdioLog, 12));
    }

    // Runner-side checks that do not trust the page's own bookkeeping.
    {
        const bad = requests.filter(r => !r.url.startsWith("/__nw_verify/") && r.status >= 400);
        const page = requests.filter(r => r.url === "/").length;
        if (!page) report("FAIL", "server: NW.js requested the page and every request was answered 2xx", "no request for / reached the server (" + requests.length + " requests)");
        else report(bad.length ? "FAIL" : "PASS", "server: NW.js requested the page and every request was answered 2xx", requests.length + " requests, " + page + " for /, " + (bad.length ? bad.length + " failed: " + bad.map(b => b.status + " " + b.url).slice(0, 5).join(", ") : "none with status >= 400"));
    }
    {
        const problems = [], seen = [];
        for (const name of SCREENSHOTS) {
            const f = path.join(opts.out, name);
            if (!fs.existsSync(f)) { problems.push(name + " missing"); continue; }
            const p = pngInfo(f);
            seen.push(name + " " + p.width + "x" + p.height + " " + p.bytes + " B");
            if (!p.png) problems.push(name + " is not a PNG");
            if (p.bytes > MAX_PNG_BYTES) problems.push(name + " is " + p.bytes + " bytes (limit " + MAX_PNG_BYTES + ")");
            if (name === "narrow_900.png" ? p.width > 900 || p.width < 860 : p.width !== WINDOW.width) problems.push(name + " width " + p.width);
            if (p.height < 800 || p.height > WINDOW.height) problems.push(name + " height " + p.height);
        }
        report(problems.length ? "FAIL" : "PASS", "screenshots: three PNGs on disk, right size, each under " + (MAX_PNG_BYTES / 1024) + " KB", problems.length ? problems.join("; ") : seen.join("; "));
    }
    {
        const chromiumLog = tail(stdioLog, 100000);
        const consoleLines = chromiumLog.split("\n").filter(l => /:CONSOLE\(/.test(l));
        const errors = consoleLines.filter(l => /:ERROR:CONSOLE\(/.test(l));
        if (!consoleLines.length) info("Chromium console log: no CONSOLE lines captured on stderr (Chromium-generated console errors could not be cross-checked from outside the page)");
        else report(errors.length ? "FAIL" : "PASS", "Chromium console log on stderr holds no ERROR lines", consoleLines.length + " console lines" + (errors.length ? "; errors: " + errors.slice(0, 3).map(l => l.replace(/^.*CONSOLE\(\d+\)\]\s*/, "")).join(" | ") : ""));
    }
    if (results) {
        const self = exited && !exited.error && exited.code !== null && !exited.signal && !timedOut;
        report(self ? "PASS" : "FAIL", "NW.js quit by itself after writing results (nw.App.quit)", exited ? "exit code " + exited.code + (exited.signal ? " signal " + exited.signal : "") + " after " + ((exited.at - started) / 1000).toFixed(1) + " s" : "still running; stopped pid " + child.pid);
    }

    if (!opts.keep) { rmrf(appDir); rmrf(profile); } else info("kept " + appDir + " and " + profile);
    const failed = lines.filter(l => l.status === "FAIL").length, passed = lines.filter(l => l.status === "PASS").length;
    process.stdout.write("RESULT: " + (failed ? "FAIL" : "PASS") + " -- " + passed + " passed, " + failed + " failed" + (results ? "" : " (no results.json)") + "; evidence in " + opts.out + "\n");
    process.exit(failed || !results ? 1 : 0);
}

main().catch(err => {
    process.stdout.write("RESULT: FAIL -- nw_verify crashed: " + (err && err.stack || err) + "\n");
    process.exit(1);
});
