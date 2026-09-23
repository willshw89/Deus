// tools/validate_srd_catalog.js - verify the dormant SRD 5.1 content library against its contract.
//
// Usage: node tools/validate_srd_catalog.js [--catalog <dir>] [--contract <docs/SRD5_1_COVERAGE_MANIFEST.md>]
//                                           [--iconset <png>] [--plugins <plugins.js>] [--world-catalog <json>]
//
// Prints one PASS or FAIL line per check and a final "RESULT: n passed, m failed (exit k)".
// Checks: manifest and files present and parseable; schema of every entry (srd_schema.js); ids unique
// across files; entries routed to the file of their category; source hash consistent; pages inside the
// category's section ranges; counts per kind within the tolerance of the contract's Expected counts
// table; placeholder icons inside the real IconSet.png; and dormancy (no plugin or plugins.js entry
// names the folder, no srd: id in the world catalog).
// Exit codes: 0 all passed, 1 a check failed, 2 the catalogue is missing.
"use strict";

const fs = require("fs");
const path = require("path");
const S = require("./srd_extract/lib/srd_schema");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const catalogDir = path.resolve(opt("--catalog", path.join(ROOT, "game", "data", "srd51")));
const contractPath = path.resolve(opt("--contract", path.join(ROOT, "docs", "SRD5_1_COVERAGE_MANIFEST.md")));
const iconsetPath = path.resolve(opt("--iconset", path.join(ROOT, "game", "img", "system", "IconSet.png")));
const pluginsPath = path.resolve(opt("--plugins", path.join(ROOT, "game", "js", "plugins.js")));
const pluginsDir = path.resolve(opt("--plugins-dir", path.join(ROOT, "game", "js", "plugins")));
const worldCatalogPath = path.resolve(opt("--world-catalog", path.join(ROOT, "game", "data", "DEUS_WorldCatalog.json")));
const sectionsPath = path.resolve(opt("--sections", path.join(__dirname, "srd_extract", "cache", "sections.json")));

let passed = 0, failed = 0;
function check(name, cond, detail) {
    if (cond) { passed++; console.log(`PASS srd.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL srd.${name}${detail ? " - " + detail : ""}`); }
    return !!cond;
}
function finish() {
    const code = failed ? 1 : 0;
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${code})`);
    process.exit(code);
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }

/** The Expected counts table of the contract: rows { category, kind, expected, tolerance }. */
function expectedCounts(md) {
    const rows = [];
    const lines = md.split(/\r?\n/);
    let inSection = false;
    for (const line of lines) {
        if (/^## /.test(line)) inSection = /^## 4\./.test(line);
        if (!inSection || !/^\|/.test(line)) continue;
        const cells = line.split("|").slice(1, -1).map(s => s.trim());
        if (cells.length < 4 || cells[0] === "category" || /^-+$/.test(cells[0])) continue;
        const expected = parseInt(cells[2], 10), tolerance = parseInt(cells[3], 10);
        if (Number.isInteger(expected) && Number.isInteger(tolerance)) rows.push({ category: cells[0], kind: cells[1], expected, tolerance });
    }
    return rows;
}

function pngSize(file) {
    const b = fs.readFileSync(file);
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function main() {
    const manifestFile = path.join(catalogDir, "catalogue_manifest.json");
    if (!fs.existsSync(manifestFile)) {
        console.error(`validate_srd_catalog: no catalogue at ${catalogDir} (run node tools/build_srd_catalog.js first)`);
        process.exit(2);
    }
    let manifest;
    try { manifest = readJson(manifestFile); } catch (e) { check("manifest_parses", false, e.message); return finish(); }
    check("manifest_parses", manifest && manifest.schemaVersion === S.SCHEMA_VERSION && manifest.dormant === true, `schemaVersion ${manifest.schemaVersion}, dormant ${manifest.dormant}`);
    check("manifest_license", !!manifest.license && manifest.license.id === S.LICENSE.id && S.attributionMatches(manifest.license.attribution), "CC-BY-4.0 attribution statement present");

    // Files
    const files = manifest.files || {};
    const loaded = {};
    const missing = [], broken = [];
    for (const cat of Object.keys(S.CATEGORIES)) {
        const file = files[cat] || S.CATEGORIES[cat];
        const full = path.join(catalogDir, file);
        if (!fs.existsSync(full)) { missing.push(file); continue; }
        try { loaded[cat] = { file, obj: readJson(full) }; } catch (e) { broken.push(`${file}: ${e.message}`); }
    }
    check("files_present", missing.length === 0 && broken.length === 0, missing.length || broken.length ? `missing ${missing.join(", ")} ${broken.join("; ")}` : `${Object.keys(loaded).length} category files`);

    // Schema, routing, uniqueness, hash
    const schemaProblems = [];
    const routing = [];
    const ids = new Map();
    const hashes = new Set();
    const all = [];
    for (const [cat, { file, obj }] of Object.entries(loaded)) {
        for (const msg of S.validateFile(obj, { strict: true })) schemaProblems.push(`${file}: ${msg}`);
        if (obj.metadata && obj.metadata.source) hashes.add(obj.metadata.source.sha256);
        for (const e of (obj.entries || [])) {
            if (!e || typeof e !== "object") continue;
            all.push(Object.assign({ _file: file }, e));
            if (e.category !== cat) routing.push(`${e.id} (${e.category}) in ${file}`);
            if (typeof e.id === "string") {
                if (ids.has(e.id)) schemaProblems.push(`duplicate id ${e.id} in ${file} and ${ids.get(e.id)}`);
                else ids.set(e.id, file);
            }
        }
    }
    check("schema", schemaProblems.length === 0, schemaProblems.length ? `${schemaProblems.length} problem(s): ${schemaProblems.slice(0, 8).join("; ")}${schemaProblems.length > 8 ? " ..." : ""}` : `${all.length} entries valid, ids unique`);
    check("category_routing", routing.length === 0, routing.length ? routing.slice(0, 5).join("; ") : "every entry sits in the file of its category");
    hashes.add(manifest.source && manifest.source.sha256);
    check("source_hash_consistent", hashes.size === 1 && [...hashes][0] && /^[0-9a-f]{64}$/.test([...hashes][0]), `sha256 ${[...hashes].join(", ")}`);

    // Pages inside the section ranges of the category (rules may draw from any chapter)
    if (fs.existsSync(sectionsPath)) {
        const sections = readJson(sectionsPath).sections || [];
        const ranges = {};
        for (const s of sections) (ranges[s.category] = ranges[s.category] || []).push(s.pages);
        const outOfRange = [];
        for (const e of all) {
            if (e.category === "rules" || !ranges[e.category] || !e.source || !Array.isArray(e.source.pages)) continue;
            const bad = e.source.pages.filter(p => !ranges[e.category].some(([a, b]) => p >= a && p <= b));
            if (bad.length) outOfRange.push(`${e.id} pages ${bad.join(",")}`);
        }
        check("pages_in_section", outOfRange.length === 0, outOfRange.length ? `${outOfRange.length} entries: ${outOfRange.slice(0, 5).join("; ")}` : "every non-rules entry cites pages inside its category's sections");
    } else {
        check("pages_in_section", false, `sections map missing at ${sectionsPath}`);
    }

    // Expected counts
    let contract = null;
    try { contract = fs.readFileSync(contractPath, "utf8"); } catch (e) { check("contract_present", false, e.message); }
    if (contract) {
        const rows = expectedCounts(contract);
        check("contract_present", rows.length > 0, `${rows.length} expected-count rows in ${path.relative(ROOT, contractPath)}`);
        const counts = {};
        for (const e of all) { const k = `${e.category}/${e.kind}`; counts[k] = (counts[k] || 0) + 1; }
        for (const r of rows) {
            const n = counts[`${r.category}/${r.kind}`] || 0;
            const ok = Math.abs(n - r.expected) <= r.tolerance;
            check(`count.${r.category}.${r.kind}`, ok, `${n} (expected ${r.expected} ± ${r.tolerance})`);
        }
        const unexpected = Object.keys(counts).filter(k => !rows.some(r => `${r.category}/${r.kind}` === k));
        check("count.no_unlisted_kinds", unexpected.length === 0, unexpected.length ? `kinds not in the contract table: ${unexpected.join(", ")}` : "every kind present is listed in the contract");
    }

    // Readiness report (informational, never FAIL by itself; schema already validates the tag)
    const byReadiness = {};
    for (const e of all) byReadiness[e.readiness] = (byReadiness[e.readiness] || 0) + 1;
    check("readiness_tagged", all.every(e => S.READINESS.includes(e.readiness)), Object.entries(byReadiness).map(([k, n]) => `${k} ${n}`).join(", ") || "no entries");
    // Verification marks: every mark in verified.json must still match its entry's text (the assembler drops stale
    // ones and lists them); a verified entry must carry the hash of the text it was verified against.
    const stale = (manifest.verification && manifest.verification.stale) || [];
    const badVerified = all.filter(e => e.readiness === "verified" && !(e.verification && e.verification.textSha256 === require("crypto").createHash("sha256").update(e.text, "utf8").digest("hex")));
    check("verification_marks_current", stale.length === 0 && badVerified.length === 0, `${byReadiness.verified || 0} verified entries; ${stale.length} stale mark(s)${stale.length ? ": " + stale.map(s => s.id).join(", ") : ""}; ${badVerified.length} verified entries whose text no longer matches`);
    // Table overlays: none refused, every applied overlay yields rows and (for dice tables) complete coverage,
    // and no table anywhere is still marked unparsed while its entry claims to be parsed.
    const refusedOverlays = (manifest.tableOverlays && manifest.tableOverlays.refused) || [];
    const overlayTables = [], badOverlay = [], unparsedButParsed = [];
    for (const e of all) {
        for (const t of ((e.data && e.data.tables) || [])) {
            if (t && t.overlay) { overlayTables.push(e.id); if (!Array.isArray(t.rows) || !t.rows.length || (t.dice && !(t.coverage && t.coverage.complete))) badOverlay.push(e.id); }
            if (t && t.unparsed && e.readiness !== "extracted") unparsedButParsed.push(e.id);
        }
    }
    check("table_overlays_sound", refusedOverlays.length === 0 && badOverlay.length === 0 && unparsedButParsed.length === 0, `${overlayTables.length} overlay table(s) applied (${[...new Set(overlayTables)].join(", ") || "none"}); ${refusedOverlays.length} refused; ${badOverlay.length} without rows or coverage; ${unparsedButParsed.length} unparsed tables on non-extracted entries`);

    // Icons inside the real sheet
    if (fs.existsSync(iconsetPath)) {
        const { width, height } = pngSize(iconsetPath);
        const maxIndex = Math.floor(width / 32) * Math.floor(height / 32) - 1;
        const badIcons = all.filter(e => !e.icon || e.icon.set !== "IconSet" || !Number.isInteger(e.icon.index) || e.icon.index < 0 || e.icon.index > maxIndex);
        check("icons_in_sheet", badIcons.length === 0, `${path.basename(iconsetPath)} ${width}x${height} -> indices 0..${maxIndex}; ${badIcons.length} entries outside`);
    } else {
        check("icons_in_sheet", false, `IconSet not found at ${iconsetPath}`);
    }

    // Dormancy: the library's canonical folder name is what a plugin would have to reference.
    const folder = opt("--dormant-name", "srd51");
    let pluginsText = "";
    try { pluginsText = fs.readFileSync(pluginsPath, "utf8"); } catch (_) { /* reported below */ }
    check("dormant_plugins_js", pluginsText.length > 0 && !pluginsText.includes(folder), pluginsText.length ? `plugins.js does not mention ${folder}/` : `plugins.js not readable at ${pluginsPath}`);
    const referencing = [];
    if (fs.existsSync(pluginsDir)) {
        for (const f of fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"))) {
            const src = fs.readFileSync(path.join(pluginsDir, f), "utf8");
            if (src.includes(folder + "/") || src.includes(folder + "\\") || src.includes(`"${folder}"`)) referencing.push(f);
        }
    }
    check("dormant_no_plugin_reads", referencing.length === 0, referencing.length ? `plugins naming ${folder}: ${referencing.join(", ")}` : `no plugin under ${path.relative(ROOT, pluginsDir)} names ${folder}`);
    let worldText = null;
    try { worldText = fs.readFileSync(worldCatalogPath, "utf8"); } catch (_) { /* reported below */ }
    check("dormant_world_catalog", worldText !== null && !worldText.includes("srd:"), worldText === null ? `world catalog not readable at ${worldCatalogPath}` : "DEUS_WorldCatalog.json contains no srd: id");

    finish();
}

main();
