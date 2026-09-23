#!/usr/bin/env node
// tools/srd_browser/serve.js - dependency-free static server for the SRD 5.1 catalogue browser.
//
//   node tools/srd_browser/serve.js [--port 8765] [--host 127.0.0.1] [--catalog game/data/srd51] [--quiet]
//
// Serves, and nothing else:
//   /                          tools/srd_browser/index.html
//   /index.html /app.js /style.css /catalog_query.js   the page's own files
//   /catalog/<name>.json       the catalogue files from --catalog (default game/data/srd51)
//   /img/system/<name>.png     game/img/system/ (the stock IconSet.png placeholder icons)
//
// GET and HEAD only, no directory listing, no path traversal (every path is resolved and
// checked against its root). Paths are relative to the project root, two levels above this
// file, so the command works from any working directory. Exports createServer/start for selftest.js.
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const BROWSER_DIR = __dirname;
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_CATALOG = path.join("game", "data", "srd51");
const DEFAULT_PORT = 8765;
const DEFAULT_HOST = "127.0.0.1";

const MIME = Object.freeze({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8"
});

/** The page's own files that may be served. Nothing else in tools/srd_browser/ is exposed. */
const PAGE_FILES = Object.freeze(["index.html", "app.js", "style.css", "catalog_query.js"]);
const SAFE_BASENAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

function parseArgs(argv) {
    const out = { port: DEFAULT_PORT, host: DEFAULT_HOST, catalog: DEFAULT_CATALOG, quiet: false, help: false };
    const args = Array.isArray(argv) ? argv.slice() : [];
    while (args.length) {
        const a = args.shift();
        if (a === "--port" || a === "-p") out.port = parseInt(args.shift(), 10);
        else if (a.startsWith("--port=")) out.port = parseInt(a.slice(7), 10);
        else if (a === "--host") out.host = String(args.shift() || DEFAULT_HOST);
        else if (a.startsWith("--host=")) out.host = a.slice(7);
        else if (a === "--catalog" || a === "-c") out.catalog = String(args.shift() || DEFAULT_CATALOG);
        else if (a.startsWith("--catalog=")) out.catalog = a.slice(10);
        else if (a === "--quiet" || a === "-q") out.quiet = true;
        else if (a === "--help" || a === "-h") out.help = true;
        else throw new Error("unknown argument: " + a);
    }
    if (!Number.isInteger(out.port) || out.port < 0 || out.port > 65535) throw new Error("--port must be an integer 0-65535");
    return out;
}

/** Resolve --catalog: absolute as given; relative to the project root first, then to the cwd. */
function resolveCatalogDir(catalog) {
    const c = catalog || DEFAULT_CATALOG;
    if (path.isAbsolute(c)) return path.resolve(c);
    const fromRoot = path.resolve(PROJECT_ROOT, c);
    if (fs.existsSync(fromRoot)) return fromRoot;
    const fromCwd = path.resolve(process.cwd(), c);
    if (fs.existsSync(fromCwd)) return fromCwd;
    return fromRoot;
}

/** Join a validated basename onto a root and make sure the result stays inside the root. */
function insideRoot(root, name) {
    const r = path.resolve(root);
    const p = path.resolve(r, name);
    if (p === r) return null;
    if (!p.startsWith(r + path.sep)) return null;
    return p;
}

/**
 * Decode the request path. Returns { pathname } or { status }. Any ".." (raw or percent-encoded),
 * backslash or null byte in the raw URL is refused before the WHATWG parser gets a chance to
 * resolve it, so "creatures.json/../x" is a 404 rather than a normalised path.
 */
function decodePath(rawUrl) {
    const raw = String(rawUrl);
    if (/%00/i.test(raw) || raw.indexOf("\0") >= 0) return { status: 400 };
    if (raw.indexOf("..") >= 0 || /%2e/i.test(raw) || raw.indexOf("\\") >= 0 || /%5c/i.test(raw)) return { status: 404 };
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(raw, "http://localhost").pathname);
    } catch (e) {
        return { status: 400 };
    }
    if (pathname.indexOf("\0") >= 0 || pathname.indexOf("..") >= 0 || pathname.indexOf("\\") >= 0) return { status: 404 };
    return { pathname };
}

/**
 * Map a request path to { file, type } or a { status } refusal. Only the routes listed at the top
 * of this file exist; every segment is validated against SAFE_BASENAME so ".." never reaches the
 * file system, and the resolved path is checked against its root anyway.
 */
function route(pathname, roots) {
    if (pathname === "/" || pathname === "/index.html") return { file: path.join(roots.browser, "index.html"), type: MIME[".html"] };
    const segs = pathname.split("/").slice(1);
    if (segs.some(s => s === "" || s === "." || s === ".." || !SAFE_BASENAME.test(s))) return { status: 404 };
    if (segs.length === 1 && PAGE_FILES.indexOf(segs[0]) >= 0) {
        const file = insideRoot(roots.browser, segs[0]);
        return file ? { file, type: MIME[path.extname(file).toLowerCase()] } : { status: 404 };
    }
    if (segs.length === 2 && segs[0] === "catalog" && /\.json$/i.test(segs[1])) {
        const file = insideRoot(roots.catalog, segs[1]);
        return file ? { file, type: MIME[".json"] } : { status: 404 };
    }
    if (segs.length === 3 && segs[0] === "img" && segs[1] === "system" && /\.png$/i.test(segs[2])) {
        const file = insideRoot(roots.imgSystem, segs[2]);
        return file ? { file, type: MIME[".png"] } : { status: 404 };
    }
    return { status: 404 };
}

function send(res, status, type, body, headOnly) {
    res.statusCode = status;
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Length", Buffer.byteLength(body));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (headOnly) res.end(); else res.end(body);
}

function createServer(options) {
    const opts = options || {};
    const roots = {
        browser: path.resolve(opts.browserDir || BROWSER_DIR),
        catalog: resolveCatalogDir(opts.catalog),
        imgSystem: path.resolve(opts.projectRoot || PROJECT_ROOT, "game", "img", "system")
    };
    const log = opts.quiet ? () => {} : (line) => process.stdout.write(line + "\n");

    const server = http.createServer((req, res) => {
        const method = req.method || "GET";
        const headOnly = method === "HEAD";
        const finish = (status) => log(method + " " + req.url + " " + status);
        if (method !== "GET" && method !== "HEAD") {
            res.setHeader("Allow", "GET, HEAD");
            send(res, 405, MIME[".txt"], "405 Method Not Allowed: this server answers GET only.\n", false);
            return finish(405);
        }
        const decoded = decodePath(req.url || "/");
        if (!decoded.pathname) {
            const status = decoded.status || 400;
            send(res, status, MIME[".txt"], status + (status === 400 ? " Bad Request\n" : " Not Found\n"), headOnly);
            return finish(status);
        }
        const r = route(decoded.pathname, roots);
        if (!r.file) { send(res, r.status || 404, MIME[".txt"], (r.status || 404) + " Not Found\n", headOnly); return finish(r.status || 404); }
        fs.stat(r.file, (err, st) => {
            if (err || !st.isFile()) { send(res, 404, MIME[".txt"], "404 Not Found\n", headOnly); return finish(404); }
            res.statusCode = 200;
            res.setHeader("Content-Type", r.type || "application/octet-stream");
            res.setHeader("Content-Length", st.size);
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("X-Content-Type-Options", "nosniff");
            if (headOnly) { res.end(); return finish(200); }
            const stream = fs.createReadStream(r.file);
            stream.on("error", () => { if (!res.headersSent) send(res, 500, MIME[".txt"], "500 read error\n", false); else res.destroy(); finish(500); });
            stream.on("end", () => finish(200));
            stream.pipe(res);
        });
    });
    server.srdRoots = roots;
    return server;
}

/** Start listening. Resolves with { server, port, host, url, roots }. */
function start(options) {
    const opts = options || {};
    const server = createServer(opts);
    const host = opts.host || DEFAULT_HOST;
    const port = Number.isInteger(opts.port) ? opts.port : DEFAULT_PORT;
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
            server.removeListener("error", reject);
            const actual = server.address().port;
            const url = "http://" + (host.indexOf(":") >= 0 ? "[" + host + "]" : host) + ":" + actual + "/";
            resolve({ server, port: actual, host, url, roots: server.srdRoots });
        });
    });
}

function usage() {
    return [
        "Usage: node tools/srd_browser/serve.js [--port 8765] [--host 127.0.0.1] [--catalog game/data/srd51] [--quiet]",
        "  --catalog   directory holding catalogue_manifest.json and the category files",
        "              (relative to the project root; e.g. --catalog tools/srd_browser/fixture)",
        "  --port 0    pick a free port",
        ""
    ].join("\n");
}

if (require.main === module) {
    let args;
    try { args = parseArgs(process.argv.slice(2)); }
    catch (e) { process.stderr.write("serve.js: " + e.message + "\n" + usage()); process.exit(2); }
    if (args.help) { process.stdout.write(usage()); process.exit(0); }
    start({ port: args.port, host: args.host, catalog: args.catalog, quiet: args.quiet }).then(info => {
        const manifest = path.join(info.roots.catalog, "catalogue_manifest.json");
        process.stdout.write("SRD 5.1 catalogue browser\n");
        process.stdout.write("  project root : " + PROJECT_ROOT + "\n");
        process.stdout.write("  catalogue    : " + info.roots.catalog + (fs.existsSync(manifest) ? "" : "  (catalogue_manifest.json NOT FOUND; the page will say so. Fixture: --catalog tools/srd_browser/fixture)") + "\n");
        process.stdout.write("  icons        : " + info.roots.imgSystem + "\n");
        process.stdout.write("  URL          : " + info.url + "\n");
        process.stdout.write("Press Ctrl+C to stop.\n");
    }).catch(err => {
        if (err && err.code === "EADDRINUSE") process.stderr.write("serve.js: port " + args.port + " is already in use; pass --port <other> or --port 0.\n");
        else process.stderr.write("serve.js: " + (err && err.message ? err.message : err) + "\n");
        process.exit(1);
    });
}

module.exports = { createServer, start, parseArgs, resolveCatalogDir, route, PROJECT_ROOT, BROWSER_DIR, DEFAULT_CATALOG, DEFAULT_PORT, DEFAULT_HOST, MIME, PAGE_FILES };
