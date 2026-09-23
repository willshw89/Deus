#!/usr/bin/env node
// tools/srd_browser/selftest.js - headless checks for the SRD 5.1 catalogue browser.
//
//   node tools/srd_browser/selftest.js               fixture, plus game/data/srd51 when it exists
//   node tools/srd_browser/selftest.js --catalog DIR  one target only (relative to the project root)
//
// For each target it starts serve.js on a free port, fetches the page files, the manifest, the
// category files and the icon sheet over HTTP, then runs catalog_query.js against the loaded
// entries (search by name, by id, by full-text keyword with typographic punctuation folded,
// category/kind/readiness/challenge/spell-level filters) and renders every entry with app.js
// under a minimal DOM shim. Prints PASS/FAIL/SKIP lines and a final RESULT line; exit code 1 on
// any FAIL. Every check compares real output with an expectation and can fail (AGENTS.md rule 4).
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const vm = require("vm");

const serve = require("./serve.js");
const Q = require("./catalog_query.js");
const PROJECT_ROOT = serve.PROJECT_ROOT;
const BROWSER_DIR = __dirname;
const FIXTURE_DIR = path.join(BROWSER_DIR, "fixture");
const REAL_DIR = path.join(PROJECT_ROOT, "game", "data", "srd51");
const RSQUO = "’", EM_DASH = "—";

// ------------------------------------------------------------------ reporting
const results = [];
let currentTarget = "";
function report(status, name, reason) {
    results.push({ status, target: currentTarget, name, reason });
    process.stdout.write(status + " " + (currentTarget ? "[" + currentTarget + "] " : "") + name + (reason ? " -- " + reason : "") + "\n");
}
async function check(name, fn) {
    try {
        const r = await fn();
        if (r === true || r === undefined) report("PASS", name);
        else if (r && r.skip) report("SKIP", name, r.skip);
        else report("FAIL", name, typeof r === "string" ? r : "returned " + JSON.stringify(r));
    } catch (err) {
        report("FAIL", name, (err && err.stack ? err.stack.split("\n").slice(0, 2).join(" | ") : String(err)));
    }
}
const eq = (a, b, what) => (a === b ? true : what + ": expected " + JSON.stringify(b) + ", got " + JSON.stringify(a));

// ------------------------------------------------------------------ raw HTTP client (no path normalisation)
function rawRequest(port, reqPath, method) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: "127.0.0.1", port, path: reqPath, method: method || "GET" }, res => {
            const chunks = [];
            res.on("data", c => chunks.push(c));
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        });
        req.on("error", reject);
        req.end();
    });
}
async function getJson(port, reqPath) {
    const r = await rawRequest(port, reqPath);
    if (r.status !== 200) throw new Error("HTTP " + r.status + " for " + reqPath);
    return JSON.parse(r.body.toString("utf8"));
}

// ------------------------------------------------------------------ minimal DOM shim for app.js renderers
function makeDom() {
    class Node {
        constructor() { this.childNodes = []; this.parentNode = null; }
        appendChild(c) {
            if (c instanceof Fragment) { for (const x of c.childNodes.slice()) this.appendChild(x); return c; }
            if (c.parentNode) c.parentNode.removeChild(c);
            c.parentNode = this; this.childNodes.push(c); return c;
        }
        removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) { this.childNodes.splice(i, 1); c.parentNode = null; } return c; }
        get firstChild() { return this.childNodes[0] || null; }
        get textContent() { return this.childNodes.map(c => c.textContent).join(""); }
        set textContent(v) { this.childNodes = []; if (v != null && v !== "") this.appendChild(new Text(String(v))); }
    }
    class Text extends Node {
        constructor(t) { super(); this.data = t; }
        get textContent() { return this.data; }
        set textContent(v) { this.data = String(v); }
    }
    class Fragment extends Node {}
    class Element extends Node {
        constructor(tag) {
            super();
            this.tagName = String(tag).toUpperCase(); this.attributes = {}; this.style = {}; this.dataset = {}; this.hidden = false; this._class = "";
            const self = this;
            this.classList = {
                add: (...c) => { const s = new Set(self._class.split(/\s+/).filter(Boolean)); c.forEach(x => s.add(x)); self._class = Array.from(s).join(" "); },
                remove: (...c) => { self._class = self._class.split(/\s+/).filter(x => x && c.indexOf(x) < 0).join(" "); },
                contains: c => self._class.split(/\s+/).indexOf(c) >= 0
            };
        }
        setAttribute(k, v) { this.attributes[k] = String(v); if (k === "id") this.id = String(v); }
        getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
        get className() { return this._class; }
        set className(v) { this._class = String(v); }
        addEventListener() {}
        querySelector() { return null; }
        get value() { return this._value || ""; }
        set value(v) { this._value = String(v); }
        select() {}
        focus() {}
    }
    const document = {
        createElement: t => new Element(t),
        createTextNode: t => new Text(String(t)),
        createDocumentFragment: () => new Fragment(),
        getElementById: () => null,
        body: new Element("body"),
        execCommand: () => true,
        addEventListener() {}
    };
    return { document, Element, Text, Fragment };
}
function loadAppRenderers() {
    const dom = makeDom();
    const sandbox = {
        document: dom.document, console, JSON, Math, Number, String, Array, Object, Promise, Date, setTimeout, clearTimeout,
        navigator: {}, location: { protocol: "http:", hash: "" }, history: {}, fetch: () => Promise.reject(new Error("no fetch in selftest")),
        SrdCatalogQuery: Q
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(BROWSER_DIR, "app.js"), "utf8"), sandbox, { filename: "app.js" });
    if (!sandbox.SrdBrowser) throw new Error("app.js did not assign window.SrdBrowser");
    return { R: sandbox.SrdBrowser, dom };
}

// ------------------------------------------------------------------ unit checks on catalog_query.js (target-independent)
async function unitChecks() {
    currentTarget = "unit";
    await check("toPlain folds typographic punctuation to ASCII", () => eq(Q.toPlain("adventurer" + RSQUO + "s " + EM_DASH + " “q” ½"), "adventurer's - \"q\" 1/2", "toPlain"));
    await check("tokenize lower-cases, folds and splits on whitespace", () => eq(JSON.stringify(Q.tokenize("  Hello" + RSQUO + "s  WORLD ")), JSON.stringify(["hello's", "world"]), "tokens"));
    await check("challengeValue parses fractions and integers", () => eq(Q.challengeValue("1/4"), 0.25, "1/4") === true && eq(Q.challengeValue("10"), 10, "10") === true && Number.isNaN(Q.challengeValue("x")) ? true : "unexpected values");
    await check("discoverFiles falls back to the six default files for an empty manifest", () => {
        const d = Q.discoverFiles({});
        return eq(d.source, "fallback", "source") === true && eq(d.files.length, 6, "count") === true && eq(d.files[3].file, "magic_items.json", "4th file") === true ? true : JSON.stringify(d);
    });
    await check("discoverFiles reads files[] objects, categories{} maps and skips the manifest itself", () => {
        const a = Q.discoverFiles({ files: [{ category: "creatures", file: "creatures.json" }, { category: "meta", file: "catalogue_manifest.json" }] });
        const b = Q.discoverFiles({ categories: { spells: "spells.json", rules: { file: "rules.json" } } });
        if (a.source !== "manifest.files" || a.files.length !== 1 || a.files[0].category !== "creatures") return "files[]: " + JSON.stringify(a);
        if (b.source !== "manifest.categories" || b.files.length !== 2 || b.files[1].category !== "rules" || b.files[1].file !== "rules.json") return "categories{}: " + JSON.stringify(b);
        return true;
    });
    await check("attributionFrom prefers the manifest, then category files, else null", () => {
        const a = Q.attributionFrom({ metadata: { license: { attribution: "A" } } }, []);
        const b = Q.attributionFrom({}, [{ file: "x.json", json: { metadata: { license: { attribution: "B" } } } }]);
        const c = Q.attributionFrom({}, [{ file: "x.json", json: {} }]);
        if (!a || a.text !== "A" || a.from !== "manifest.metadata.license.attribution") return "manifest: " + JSON.stringify(a);
        if (!b || b.text !== "B" || !/x\.json/.test(b.from)) return "file: " + JSON.stringify(b);
        if (c !== null) return "absent: " + JSON.stringify(c);
        return true;
    });
    await check("iconOffset maps 16 icons per row of 32 px and rejects out-of-sheet indices", () => {
        const a = Q.iconOffset(0), b = Q.iconOffset(17), c = Q.iconOffset(399);
        if (!a || a.x !== 0 || a.y !== 0) return "0: " + JSON.stringify(a);
        if (!b || b.x !== 32 || b.y !== 32) return "17: " + JSON.stringify(b);
        if (!c || c.x !== 480 || c.y !== 768) return "399: " + JSON.stringify(c);
        if (Q.iconOffset(400) !== null || Q.iconOffset(-1) !== null || Q.iconOffset("3") !== null) return "out of range not rejected";
        return true;
    });
    await check("search ranks an exact id above an exact name above a text match", () => {
        const idx = Q.buildIndex([
            { id: "srd:rule:x", category: "rules", kind: "rule", name: "Elsewhere", text: "mentions the aboleth twice: aboleth", data: {}, readiness: "parsed" },
            { id: "srd:creature:aboleth", category: "creatures", kind: "creature", name: "Aboleth", text: "a fish", data: {}, readiness: "parsed" },
            { id: "srd:creature:other", category: "creatures", kind: "creature", name: "Other", text: "srd:creature:aboleth is referenced here", data: {}, readiness: "parsed" }
        ]);
        const byName = Q.search(idx, { query: "aboleth" });
        const byId = Q.search(idx, { query: "srd:creature:aboleth" });
        if (byName.length !== 3 || byName[0].id !== "srd:creature:aboleth") return "by name: " + byName.map(e => e.id).join(",");
        if (byId.length !== 2 || byId[0].id !== "srd:creature:aboleth") return "by id: " + byId.map(e => e.id).join(",");
        return true;
    });
    await check("every element id app.js looks up exists in index.html, and index.html loads both scripts", () => {
        const app = fs.readFileSync(path.join(BROWSER_DIR, "app.js"), "utf8");
        const html = fs.readFileSync(path.join(BROWSER_DIR, "index.html"), "utf8");
        const ids = Array.from(new Set(Array.from(app.matchAll(/document\.getElementById\("([^"]+)"\)/g)).map(m => m[1])));
        if (ids.length < 10) return "only " + ids.length + " ids found in app.js";
        const missing = ids.filter(id => !new RegExp('id="' + id.replace(/[-]/g, "\\-") + '"').test(html));
        if (missing.length) return "index.html lacks id(s): " + missing.join(", ");
        if (!/<script src="catalog_query\.js"><\/script>\s*<script src="app\.js"><\/script>/.test(html)) return "scripts not loaded in the order catalog_query.js then app.js";
        if (/https?:\/\//.test(html.replace(/<meta[^>]*>/g, "")) || /https?:\/\//.test(fs.readFileSync(path.join(BROWSER_DIR, "style.css"), "utf8"))) return "index.html or style.css references an external URL";
        return true;
    });
    await check("search requires every word to match (data values count, notes do not)", () => {
        const idx = Q.buildIndex([{ id: "srd:spell:a", category: "spells", kind: "spell", name: "Alpha", text: "alpha text", data: { classes: ["Wizard"] }, readiness: "parsed", notes: ["secretnote"] }]);
        if (Q.search(idx, { query: "alpha wizard" }).length !== 1) return "name + data value should match";
        if (Q.search(idx, { query: "alpha secretnote" }).length !== 0) return "notes must not be searchable";
        if (Q.search(idx, { query: "alpha missingword" }).length !== 0) return "a missing word must exclude the entry";
        return true;
    });
}

// ------------------------------------------------------------------ per-target suite
async function suite(label, catalogDir) {
    currentTarget = label;
    let info;
    await check("server starts on a free port and reports a URL", async () => {
        info = await serve.start({ port: 0, catalog: catalogDir, quiet: true });
        return /^http:\/\/127\.0\.0\.1:\d+\/$/.test(info.url) && info.port > 0 ? true : "url " + info.url;
    });
    if (!info) return;
    const port = info.port;
    const loaded = { manifest: null, files: [], entries: [], index: null };
    try {
        await check("GET / serves index.html as text/html with the page title", async () => {
            const r = await rawRequest(port, "/");
            return r.status === 200 && /^text\/html/.test(r.headers["content-type"]) && /<title>SRD 5\.1 Catalogue Browser<\/title>/.test(r.body.toString()) ? true : "status " + r.status + " type " + r.headers["content-type"];
        });
        for (const [p, type] of [["/index.html", "text/html"], ["/app.js", "text/javascript"], ["/style.css", "text/css"], ["/catalog_query.js", "text/javascript"]]) {
            await check("GET " + p + " is 200 " + type, async () => {
                const r = await rawRequest(port, p);
                return r.status === 200 && String(r.headers["content-type"]).startsWith(type) && r.body.length > 100 ? true : "status " + r.status + " type " + r.headers["content-type"] + " bytes " + r.body.length;
            });
        }
        await check("GET /img/system/IconSet.png is image/png, 512x800", async () => {
            const r = await rawRequest(port, "/img/system/IconSet.png");
            if (r.status !== 200 || r.headers["content-type"] !== "image/png") return "status " + r.status + " type " + r.headers["content-type"];
            const sig = r.body.slice(0, 8).toString("hex");
            if (sig !== "89504e470d0a1a0a") return "not a PNG signature: " + sig;
            const w = r.body.readUInt32BE(16), hgt = r.body.readUInt32BE(20);
            return w === 512 && hgt === 800 ? true : "dimensions " + w + "x" + hgt;
        });
        await check("no directory listing: /catalog/ and /catalog are 404", async () => {
            const a = await rawRequest(port, "/catalog/"), b = await rawRequest(port, "/catalog");
            return a.status === 404 && b.status === 404 ? true : a.status + "/" + b.status;
        });
        await check("path traversal is refused (raw .., encoded .., nested ..)", async () => {
            const paths = ["/catalog/../../../AGENTS.md", "/catalog/%2e%2e/%2e%2e/AGENTS.md", "/catalog/..%2F..%2FAGENTS.md", "/catalog/creatures.json/../catalogue_manifest.json", "/img/system/../../../package.json", "/../tools/srd_browser/serve.js"];
            const bad = [];
            for (const p of paths) { const r = await rawRequest(port, p); if (r.status === 200) bad.push(p); }
            return bad.length ? "served: " + bad.join(", ") : true;
        });
        await check("only the page files are exposed: /serve.js, /selftest.js, /fixture/* are 404", async () => {
            const bad = [];
            for (const p of ["/serve.js", "/selftest.js", "/fixture/creatures.json", "/fixture/catalogue_manifest.json"]) { const r = await rawRequest(port, p); if (r.status !== 404) bad.push(p + "=" + r.status); }
            return bad.length ? bad.join(", ") : true;
        });
        await check("unknown paths are 404 and a null byte is 400", async () => {
            const a = await rawRequest(port, "/nope"), b = await rawRequest(port, "/catalog/%00.json");
            return a.status === 404 && b.status === 400 ? true : a.status + "/" + b.status;
        });
        await check("POST is 405 with an Allow header; HEAD works", async () => {
            const a = await rawRequest(port, "/", "POST"), b = await rawRequest(port, "/app.js", "HEAD");
            return a.status === 405 && /GET/.test(String(a.headers.allow)) && b.status === 200 && b.body.length === 0 ? true : "POST " + a.status + " HEAD " + b.status + "/" + b.body.length;
        });
        await check("GET /catalog/catalogue_manifest.json is 200 application/json and parses", async () => {
            const r = await rawRequest(port, "/catalog/" + Q.MANIFEST_FILE);
            if (r.status !== 200 || !/^application\/json/.test(r.headers["content-type"])) return "status " + r.status + " type " + r.headers["content-type"];
            loaded.manifest = JSON.parse(r.body.toString("utf8"));
            return typeof loaded.manifest === "object" && loaded.manifest !== null ? true : "not an object";
        });
        if (!loaded.manifest) return;
        const discovered = Q.discoverFiles(loaded.manifest);
        // A synthetic fixture declares metadata.fixture: true; everything else is treated as real SRD data.
        const isFixture = !!(loaded.manifest.metadata && loaded.manifest.metadata.fixture === true);
        if (isFixture !== (label === "fixture")) process.stdout.write("INFO manifest metadata.fixture=" + isFixture + "; running the " + (isFixture ? "fixture" : "real-data") + " expectations\n");
        await check("manifest names the category files (not the fallback list)", () => discovered.source !== "fallback" ? true : "no files[]/categories{} found; keys: " + Object.keys(loaded.manifest).join(","));
        await check("every named category file loads over HTTP with an entries[] array", async () => {
            const problems = [];
            for (const f of discovered.files) {
                try {
                    const json = await getJson(port, "/catalog/" + f.file);
                    const entries = Array.isArray(json) ? json : json.entries;
                    if (!Array.isArray(entries)) { problems.push(f.file + ": no entries[]"); continue; }
                    for (const e of entries) if (e && e.category == null) e.category = f.category;
                    loaded.files.push({ category: f.category, file: f.file, json, entries });
                    loaded.entries = loaded.entries.concat(entries);
                } catch (err) { problems.push(f.file + ": " + err.message); }
            }
            return problems.length ? problems.join("; ") : true;
        });
        await check("attribution string present and names SRD 5.1 and the CC BY 4.0 licence URL", () => {
            const a = Q.attributionFrom(loaded.manifest, loaded.files);
            if (!a) return "none found";
            return /System Reference Document 5\.1/.test(a.text) && /creativecommons\.org\/licenses\/by\/4\.0/.test(a.text) ? true : "text: " + a.text.slice(0, 80);
        });
        const entries = loaded.entries;
        await check("catalogue has entries", () => entries.length > 0 ? true : "0 entries");
        if (!entries.length) return;
        await check("every entry has id, category, kind, name, source.pages, text, readiness (known tag) and icon.index 0-399", () => {
            const bad = [];
            entries.forEach((e, i) => {
                const why = [];
                if (!e || typeof e !== "object") { bad.push("#" + i + ": not an object"); return; }
                if (typeof e.id !== "string" || !e.id) why.push("id");
                if (Q.CATEGORIES.findIndex(c => c.id === e.category) < 0) why.push("category=" + e.category);
                if (Q.KINDS.indexOf(e.kind) < 0) why.push("kind=" + e.kind);
                if (typeof e.name !== "string" || !e.name) why.push("name");
                if (!e.source || e.source.pages == null) why.push("source.pages");
                if (typeof e.text !== "string" || !e.text.trim()) why.push("text");
                if (Q.READINESS.indexOf(e.readiness) < 0) why.push("readiness=" + e.readiness);
                if (!e.icon || !Number.isInteger(e.icon.index) || e.icon.index < 0 || e.icon.index >= Q.ICON_COUNT) why.push("icon");
                if (why.length) bad.push((e.id || "#" + i) + ": " + why.join(","));
            });
            return bad.length ? bad.length + " bad: " + bad.slice(0, 5).join(" | ") : true;
        });
        await check("ids are unique and follow srd:<kind>:<slug> with the kind segment matching entry.kind", () => {
            const seen = new Map(), bad = [];
            for (const e of entries) {
                const m = /^srd:([a-z0-9-]+):([a-z0-9-]+)$/.exec(String(e.id));
                if (!m) bad.push("format " + e.id);
                else if (m[1] !== e.kind) bad.push("kind " + e.id + " vs " + e.kind);
                if (seen.has(e.id)) bad.push("duplicate " + e.id);
                seen.set(e.id, true);
            }
            return bad.length ? bad.length + " problems: " + bad.slice(0, 5).join(" | ") : true;
        });
        const index = Q.buildIndex(entries);
        loaded.index = index;
        await check("index builds one doc per entry with a non-empty haystack", () => {
            if (index.docs.length !== entries.length) return "docs " + index.docs.length + " vs entries " + entries.length;
            const empty = index.docs.filter(d => !d.hay).length;
            return empty ? empty + " empty haystacks" : true;
        });
        await check("search by exact name puts an entry with that name first (every entry)", () => {
            const bad = [];
            for (const e of entries) {
                const r = Q.search(index, { query: e.name });
                if (!r.length || Q.fold(r[0].name) !== Q.fold(e.name)) bad.push(e.id + " -> " + (r[0] ? r[0].id : "none"));
            }
            return bad.length ? bad.length + " misses: " + bad.slice(0, 5).join(" | ") : true;
        });
        await check("search by id returns that entry first and resolveId gives exactly one (every entry)", () => {
            const bad = [];
            for (const e of entries) {
                const r = Q.search(index, { query: e.id });
                if (!r.length || r[0].id !== e.id) bad.push("search " + e.id);
                if (Q.resolveId(index, e.id).length !== 1) bad.push("resolve " + e.id);
            }
            return bad.length ? bad.length + " misses: " + bad.slice(0, 5).join(" | ") : true;
        });
        const knownId = isFixture ? "srd:creature:test-gloomcrab" : "srd:creature:aboleth";
        await check("known id " + knownId + " resolves to exactly one entry", () => {
            const r = Q.resolveId(index, knownId);
            return r.length === 1 && r[0].id === knownId ? true : r.length + " entries";
        });
        await check("unknown id resolves to zero entries", () => eq(Q.resolveId(index, "srd:creature:zz-no-such-entry").length, 0, "count"));
        await check("full-text keyword: a straight apostrophe finds text printed with a curly one", () => {
            const rx = new RegExp("[A-Za-z]+" + RSQUO + "[A-Za-z]+");
            const target = entries.find(e => rx.test(e.text));
            if (!target) return isFixture ? "fixture has no curly-apostrophe word" : { skip: "no entry text contains a curly apostrophe inside a word" };
            const word = rx.exec(target.text)[0];
            const ascii = Q.toPlain(word);
            if (ascii === word) return "fold did nothing to " + word;
            const r = Q.search(index, { query: ascii });
            return r.some(e => e.id === target.id) ? true : "'" + ascii + "' did not find " + target.id;
        });
        await check("full-text keyword: two words from an entry's text find that entry (sampled)", () => {
            const step = Math.max(1, Math.floor(entries.length / 25));
            const bad = []; let tried = 0;
            for (let i = 0; i < entries.length; i += step) {
                const e = entries[i];
                const words = Array.from(new Set(Q.fold(e.text).split(/[^a-z]+/).filter(w => w.length >= 6)));
                if (words.length < 2) continue;
                tried++;
                const r = Q.search(index, { query: words[0] + " " + words[words.length - 1] });
                if (!r.some(x => x.id === e.id)) bad.push(e.id);
            }
            if (!tried) return "no entry had two long words";
            return bad.length ? bad.length + "/" + tried + " misses: " + bad.slice(0, 5).join(", ") : true;
        });
        await check("full-text keyword: a data value absent from the text is searchable (spell class)", () => {
            const spell = entries.find(e => e.kind === "spell" && e.data && Array.isArray(e.data.classes) && e.data.classes.length && !Q.fold(e.text).includes(Q.fold(e.data.classes[0])));
            if (!spell) return isFixture ? "fixture has no spell whose class is absent from its text" : { skip: "no spell with a class name absent from its text" };
            const r = Q.search(index, { query: spell.name + " " + spell.data.classes[0] });
            return r.some(e => e.id === spell.id) ? true : "did not find " + spell.id;
        });
        await check("nonsense query returns zero results", () => eq(Q.search(index, { query: "zzqxv nonsense-token-9f3a7" }).length, 0, "count"));
        await check("a real word plus a nonsense word returns zero results", () => eq(Q.search(index, { query: entries[0].name + " zzqxv9f3a7" }).length, 0, "count"));
        await check("empty query returns every entry in catalogue order", () => {
            const r = Q.search(index, { query: "" });
            return r.length === entries.length && r.every((e, i) => e === entries[i]) ? true : "length " + r.length;
        });
        await check("category filter returns exactly the entries of each category", () => {
            const bad = [];
            for (const c of index.categories) {
                const r = Q.search(index, { category: c });
                const expected = entries.filter(e => e.category === c).length;
                if (r.length !== expected || r.some(e => e.category !== c)) bad.push(c + ": " + r.length + " vs " + expected);
            }
            if (Q.search(index, { category: "no-such-category" }).length !== 0) bad.push("unknown category not empty");
            return bad.length ? bad.join("; ") : true;
        });
        await check("kind filter returns exactly the entries of each kind", () => {
            const bad = [];
            for (const k of index.kinds) {
                const r = Q.search(index, { kind: k });
                const expected = entries.filter(e => e.kind === k).length;
                if (r.length !== expected || r.some(e => e.kind !== k)) bad.push(k + ": " + r.length + " vs " + expected);
            }
            return bad.length ? bad.join("; ") : true;
        });
        await check("readiness filter returns exactly the entries of each tag; an unknown tag returns zero", () => {
            const bad = [];
            for (const t of index.readiness) {
                const r = Q.search(index, { readiness: t });
                const expected = entries.filter(e => e.readiness === t).length;
                if (r.length !== expected || r.some(e => e.readiness !== t)) bad.push(t + ": " + r.length + " vs " + expected);
            }
            if (Q.search(index, { readiness: "bogus" }).length !== 0) bad.push("bogus tag not empty");
            return bad.length ? bad.join("; ") : true;
        });
        await check("readiness tags in the index are known, in canonical order, and match what the manifest declares (fixture: all four)", () => {
            const tags = index.readiness;
            if (!tags.length) return "index lists no readiness tags";
            const unknown = tags.filter(t => Q.READINESS.indexOf(t) < 0);
            if (unknown.length) return "unknown tag(s): " + unknown.join(",");
            const canonical = Q.READINESS.filter(t => tags.indexOf(t) >= 0);
            if (tags.join(",") !== canonical.join(",")) return "order " + tags.join(",") + " differs from canonical " + canonical.join(",");
            if (isFixture) return eq(tags.join(","), Q.READINESS.join(","), "fixture tags");
            const declared = Q.declaredCounts(loaded.manifest).totals.readiness;
            if (!declared) return "manifest declares no totals readiness counts, so the loaded tags (" + tags.join(",") + ") cannot be checked against it";
            const declaredTags = Q.READINESS.filter(t => Object.keys(declared).indexOf(t) >= 0);
            return eq(tags.join(","), declaredTags.join(","), "loaded tags vs manifest totals");
        });
        await check("challenge rating filter returns exactly the creatures with that rating", () => {
            if (!index.challenges.length) return isFixture ? "fixture has no challenge ratings" : { skip: "no creature has data.challenge" };
            const bad = [];
            for (const cr of index.challenges) {
                const r = Q.search(index, { category: "creatures", challenge: cr });
                const expected = entries.filter(e => e.category === "creatures" && Q.challengeKey(e) === cr).length;
                if (r.length !== expected || r.length === 0) bad.push("CR " + cr + ": " + r.length + " vs " + expected);
            }
            if (Q.search(index, { challenge: "99/7" }).length !== 0) bad.push("bogus CR not empty");
            const sorted = index.challenges.map(Q.challengeValue);
            for (let i = 1; i < sorted.length; i++) if (!(Number.isNaN(sorted[i]) || sorted[i] >= sorted[i - 1])) bad.push("challenges not sorted: " + index.challenges.join(","));
            return bad.length ? bad.join("; ") : true;
        });
        await check("spell level filter returns exactly the spells of that level", () => {
            if (!index.spellLevels.length) return isFixture ? "fixture has no spell levels" : { skip: "no spell has data.level" };
            const bad = [];
            for (const lvl of index.spellLevels) {
                const r = Q.search(index, { category: "spells", spellLevel: lvl });
                const expected = entries.filter(e => Q.spellLevelKey(e) === lvl).length;
                if (r.length !== expected || r.length === 0 || r.some(e => e.kind !== "spell")) bad.push("level " + lvl + ": " + r.length + " vs " + expected);
            }
            if (Q.search(index, { spellLevel: "42" }).length !== 0) bad.push("bogus level not empty");
            return bad.length ? bad.join("; ") : true;
        });
        await check("combined filters: category plus a mismatching kind returns zero; category plus a name finds it", () => {
            if (Q.search(index, { category: "creatures", kind: "spell" }).length !== 0) return "creatures+spell not empty";
            const c = entries.find(e => e.category === "creatures");
            if (!c) return { skip: "no creatures" };
            const r = Q.search(index, { category: "creatures", query: c.name });
            return r.length && r[0].id === c.id ? true : "did not find " + c.id;
        });
        await check("coverage() totals equal the entry count and per-category sums", () => {
            const cov = Q.coverage(entries);
            const sum = Object.values(cov.byCategory).reduce((a, c) => a + c.entries, 0);
            const rSum = Object.values(cov.totals.readiness).reduce((a, n) => a + n, 0);
            return cov.totals.entries === entries.length && sum === entries.length && rSum === entries.length ? true : "totals " + cov.totals.entries + " sum " + sum + " readiness " + rSum;
        });
        await check("manifest-declared counts, when present, match the loaded counts", () => {
            const declared = Q.declaredCounts(loaded.manifest);
            const cov = Q.coverage(entries);
            const bad = [];
            let any = false;
            if (declared.totals.entries !== undefined) { any = true; if (declared.totals.entries !== cov.totals.entries) bad.push("total " + declared.totals.entries + " vs " + cov.totals.entries); }
            for (const c of Object.keys(declared.byCategory)) {
                const d = declared.byCategory[c];
                if (d.entries === undefined) continue;
                any = true;
                const l = cov.byCategory[c] ? cov.byCategory[c].entries : 0;
                if (d.entries !== l) bad.push(c + " " + d.entries + " vs " + l);
            }
            if (!any) return isFixture ? "fixture manifest declares no counts" : { skip: "manifest declares no counts" };
            return bad.length ? bad.join("; ") : true;
        });
        await check("search over the whole catalogue is fast (100 queries)", () => {
            const t0 = process.hrtime.bigint();
            const words = ["the", "attack", "damage", "fire", "creature", "spell", "armor", "you", "target", "hit"];
            for (let i = 0; i < 100; i++) Q.search(index, { query: words[i % words.length] + " " + words[(i * 3) % words.length] });
            const ms = Number(process.hrtime.bigint() - t0) / 1e6;
            process.stdout.write("      100 two-word searches over " + entries.length + " entries: " + ms.toFixed(1) + " ms\n");
            return ms < 2000 ? true : ms.toFixed(0) + " ms for 100 searches";
        });

        // Renderers under the DOM shim
        let app;
        await check("app.js loads under the DOM shim and exposes its renderers", () => { app = loadAppRenderers(); return typeof app.R.buildDetail === "function" ? true : "no buildDetail"; });
        if (app) {
            const R = app.R;
            await check("every entry renders a detail pane with name, id, copy button, verbatim text and raw JSON", () => {
                const bad = [];
                for (const e of entries) {
                    let text;
                    try { text = R.buildDetail(e).textContent; } catch (err) { bad.push(e.id + ": threw " + err.message); continue; }
                    const why = [];
                    if (!text.includes(e.name)) why.push("name");
                    if (!text.includes(e.id)) why.push("id");
                    for (const s of ["Copy Stable ID", "Verbatim text", "Raw JSON"]) if (!text.includes(s)) why.push(s);
                    if (text.includes("Formatted view failed")) why.push("formatted view fell back to generic");
                    if (why.length) bad.push(e.id + ": " + why.join(","));
                }
                return bad.length ? bad.length + " problems: " + bad.slice(0, 5).join(" | ") : true;
            });
            await check("creature stat blocks show AC, HP, speed, ability table, challenge and actions", () => {
                const creatures = entries.filter(e => e.kind === "creature");
                if (!creatures.length) return { skip: "no creatures" };
                const bad = [];
                for (const e of creatures) {
                    const text = R.renderKindView(e).textContent;
                    const need = ["Armor Class", "Hit Points", "Speed", "STR", "CHA"];
                    if (e.data && e.data.challenge) need.push("Challenge");
                    if (e.data && Array.isArray(e.data.actions) && e.data.actions.length) need.push("Actions");
                    if (e.data && e.data.legendaryActions) need.push("Legendary Actions");
                    const miss = need.filter(s => !text.includes(s));
                    if (miss.length) bad.push(e.id + ": missing " + miss.join(","));
                }
                return bad.length ? bad.length + " problems: " + bad.slice(0, 5).join(" | ") : true;
            });
            await check("ability modifiers are computed (score 18 -> +4, score 9 -> -1)", () => {
                const e = { kind: "creature", data: { abilities: { str: 18, dex: 9, con: 10, int: 10, wis: 10, cha: 10 } } };
                const text = R.renderCreature(e).textContent;
                return text.includes("18 (+4)") && text.includes("9 (−1)") ? true : "got: " + text.slice(0, 120);
            });
            await check("spell view shows the level/school line, casting time, range, components and duration", () => {
                const spells = entries.filter(e => e.kind === "spell");
                if (!spells.length) return { skip: "no spells" };
                const bad = [];
                for (const e of spells) {
                    const text = R.renderKindView(e).textContent;
                    const miss = ["Casting Time:", "Range:", "Components:", "Duration:"].filter(s => !text.includes(s));
                    const lvl = e.data && e.data.level;
                    if (lvl === 0 && !/cantrip/i.test(text)) miss.push("cantrip line");
                    if (typeof lvl === "number" && lvl > 0 && !text.includes(R.ordinal(lvl) + "-level")) miss.push("level line");
                    if (miss.length) bad.push(e.id + ": " + miss.join(","));
                }
                return bad.length ? bad.length + " problems: " + bad.slice(0, 5).join(" | ") : true;
            });
            await check("equipment and magic-item views show a property table (Cost / Rarity)", () => {
                const eq_ = entries.filter(e => e.category === "equipment"), mi = entries.filter(e => e.kind === "magic-item");
                if (!eq_.length && !mi.length) return { skip: "no equipment or magic items" };
                const bad = [];
                for (const e of eq_) { const t = R.renderKindView(e).textContent; if (!t.includes("Cost")) bad.push(e.id + ": no Cost"); }
                for (const e of mi) { const t = R.renderKindView(e).textContent; if (!t.includes("Rarity") || !t.includes("Attunement")) bad.push(e.id + ": no Rarity/Attunement"); }
                return bad.length ? bad.length + " problems: " + bad.slice(0, 5).join(" | ") : true;
            });
            await check("tables in data render as tables with their captions and column headers", () => {
                const withTables = entries.filter(e => e.data && Array.isArray(e.data.tables) && e.data.tables.some(t => t && Array.isArray(t.columns) && t.columns.length));
                if (!withTables.length) return isFixture ? "fixture has no data.tables" : { skip: "no entry has data.tables with columns" };
                const bad = [];
                for (const e of withTables) {
                    const el = R.renderKindView(e);
                    const t = e.data.tables.find(x => x && Array.isArray(x.columns) && x.columns.length);
                    const found = [];
                    (function walk(n) { if (n.tagName === "TABLE" && n.className === "grid") found.push(n); (n.childNodes || []).forEach(walk); })(el);
                    const text = el.textContent;
                    if (!found.length) bad.push(e.id + ": no <table class=grid>");
                    else if (t.caption && !text.includes(t.caption)) bad.push(e.id + ": caption missing");
                    else if (!text.includes(String(t.columns[0]))) bad.push(e.id + ": column header missing");
                }
                return bad.length ? bad.join("; ") : true;
            });
            await check("result rows carry the name, kind badge, readiness badge and page citation", () => {
                const bad = [];
                entries.forEach((e, i) => {
                    const li = R.buildResultRow(e, i);
                    const text = li.textContent;
                    const pages = R.fmtPages(e.source);
                    if (li.tagName !== "LI" || li.getAttribute("role") !== "option") bad.push(e.id + ": not a listbox option");
                    else if (!text.includes(e.name) || !text.includes(e.kind) || !text.includes(e.readiness) || (pages && !text.includes(pages))) bad.push(e.id + ": " + text);
                });
                return bad.length ? bad.length + " problems: " + bad.slice(0, 3).join(" | ") : true;
            });
            await check("page citation formats single and multiple pages", () => {
                const a = R.fmtPages({ pages: [261, 262] }), b = R.fmtPages({ pages: [5] }), c = R.fmtPages({ pages: [[1, 3]] });
                return a === "pp. 261–262" && b === "p. 5" && c === "pp. 1–3" ? true : JSON.stringify([a, b, c]);
            });
            await check("coverage panel lists every category, the totals and the attribution", () => {
                const model = { manifest: loaded.manifest, files: discovered.files.map(f => ({ category: f.category, file: f.file })), filesSource: discovered.source, entries, loadErrors: [], attribution: Q.attributionFrom(loaded.manifest, loaded.files) };
                const text = R.buildCoverage(model).textContent;
                const miss = [];
                for (const c of index.categories) { const k = Q.CATEGORIES.find(x => x.id === c); if (!text.includes(k ? k.label : c)) miss.push(c); }
                if (!text.includes("Total")) miss.push("Total");
                if (model.attribution && !text.includes(model.attribution.text)) miss.push("attribution");
                return miss.length ? "missing " + miss.join(",") : true;
            });
            await check("missing-catalogue message names the serve.js command and the fixture option", () => {
                const text = R.buildLoadError("manifest", "HTTP 404").textContent;
                return text.includes("node tools/srd_browser/serve.js") && text.includes("--catalog tools/srd_browser/fixture") && text.includes("catalogue_manifest.json") ? true : text.slice(0, 200);
            });
        }
    } finally {
        await new Promise(resolve => info.server.close(resolve));
    }
}

// ------------------------------------------------------------------ main
async function main() {
    const argv = process.argv.slice(2);
    const targets = [];
    const ci = argv.indexOf("--catalog");
    if (ci >= 0) {
        const dir = serve.resolveCatalogDir(argv[ci + 1]);
        targets.push({ label: path.basename(dir) === "fixture" ? "fixture" : "custom", dir });
    } else {
        targets.push({ label: "fixture", dir: FIXTURE_DIR });
        if (fs.existsSync(path.join(REAL_DIR, Q.MANIFEST_FILE))) targets.push({ label: "real", dir: REAL_DIR });
        else process.stdout.write("INFO real catalogue not present (" + path.join(REAL_DIR, Q.MANIFEST_FILE) + "); testing the fixture only\n");
    }
    await unitChecks();
    for (const t of targets) {
        process.stdout.write("=== target " + t.label + ": " + t.dir + "\n");
        await suite(t.label, t.dir);
    }
    const passed = results.filter(r => r.status === "PASS").length;
    const failed = results.filter(r => r.status === "FAIL").length;
    const skipped = results.filter(r => r.status === "SKIP").length;
    const perTarget = ["unit"].concat(targets.map(t => t.label)).map(l => {
        const rs = results.filter(r => r.target === l);
        return l + " " + rs.filter(r => r.status === "PASS").length + "/" + rs.filter(r => r.status !== "SKIP").length + (rs.some(r => r.status === "SKIP") ? " (+" + rs.filter(r => r.status === "SKIP").length + " skipped)" : "");
    }).join(", ");
    process.stdout.write("RESULT: " + (failed ? "FAIL" : "PASS") + " -- " + passed + " passed, " + failed + " failed, " + skipped + " skipped [" + perTarget + "]\n");
    process.exit(failed ? 1 : 0);
}

main().catch(err => {
    process.stdout.write("RESULT: FAIL -- selftest crashed: " + (err && err.stack || err) + "\n");
    process.exit(1);
});
