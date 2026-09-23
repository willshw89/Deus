// tools/build_srd_catalog.js - assemble the dormant SRD 5.1 content library.
//
// Usage: node tools/build_srd_catalog.js [--staging <dir>] [--out <dir>] [--dry-run]
//
// Reads every tools/srd_extract/staging/staging_*.json, validates each entry against the contract
// (tools/srd_extract/lib/srd_schema.js, docs/SRD5_1_COVERAGE_MANIFEST.md), refuses duplicate ids,
// adds the placeholder icon of each kind, routes entries into one file per category under
// game/data/srd51/ and writes catalogue_manifest.json. Nothing here is loaded by the game.
// Exit codes: 0 written, 1 contract violations (nothing written), 2 inputs missing.
"use strict";

const fs = require("fs");
const path = require("path");
const S = require("./srd_extract/lib/srd_schema");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const stagingDir = path.resolve(opt("--staging", path.join(__dirname, "srd_extract", "staging")));
const outDir = path.resolve(opt("--out", path.join(ROOT, "game", "data", "srd51")));
const cacheManifestPath = path.resolve(opt("--cache-manifest", path.join(__dirname, "srd_extract", "cache", "manifest.json")));
const dryRun = args.includes("--dry-run");

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main() {
    if (!fs.existsSync(stagingDir)) {
        console.error(`build_srd_catalog: staging directory not found: ${stagingDir}`);
        process.exit(2);
    }
    const stagingFiles = fs.readdirSync(stagingDir).filter(f => /^staging_.*\.json$/.test(f)).sort();
    if (!stagingFiles.length) {
        console.error(`build_srd_catalog: no staging_*.json in ${stagingDir}`);
        process.exit(2);
    }
    const cacheManifest = fs.existsSync(cacheManifestPath) ? readJson(cacheManifestPath) : null;

    const problems = [];
    const byId = new Map();
    const byCategory = {};
    for (const c of Object.keys(S.CATEGORIES)) byCategory[c] = { entries: [], warnings: [], stagingSources: [] };
    const stagingSummary = [];
    let sourceHash = null;

    for (const file of stagingFiles) {
        let obj;
        try {
            obj = readJson(path.join(stagingDir, file));
        } catch (e) {
            problems.push(`${file}: not valid JSON (${e.message})`);
            continue;
        }
        const fileProblems = S.validateFile(obj, { strict: true });
        for (const msg of fileProblems) problems.push(`${file}: ${msg}`);
        const m = obj.metadata || {};
        if (m.source && m.source.sha256) {
            if (sourceHash && sourceHash !== m.source.sha256) problems.push(`${file}: source sha256 ${m.source.sha256} differs from ${sourceHash} in another staging file`);
            sourceHash = sourceHash || m.source.sha256;
        }
        const entries = Array.isArray(obj.entries) ? obj.entries : [];
        const kinds = {};
        for (const e of entries) {
            if (!e || typeof e.id !== "string") continue;
            if (byId.has(e.id)) {
                problems.push(`${file}: duplicate id ${e.id} (already in ${byId.get(e.id)})`);
                continue;
            }
            byId.set(e.id, file);
            if (!S.CATEGORIES[e.category] || !S.KINDS[e.kind]) continue; // reported by validateFile
            kinds[e.kind] = (kinds[e.kind] || 0) + 1;
            const out = Object.assign({}, e, { icon: { set: "IconSet", index: S.KINDS[e.kind].icon } });
            byCategory[e.category].entries.push(out);
            if (!byCategory[e.category].stagingSources.includes(file)) byCategory[e.category].stagingSources.push(file);
        }
        const warnings = Array.isArray(obj.warnings) ? obj.warnings : [];
        for (const w of warnings) {
            const cat = w && w.category && S.CATEGORIES[w.category] ? w.category : (m.category && S.CATEGORIES[m.category] ? m.category : null);
            if (cat) byCategory[cat].warnings.push(Object.assign({ stagingFile: file }, w));
        }
        stagingSummary.push({ file, generator: m.generator || null, generatedAt: m.generatedAt || null, category: m.category || null, entries: entries.length, byKind: kinds, warnings: warnings.length });
    }

    if (problems.length) {
        console.error(`build_srd_catalog: ${problems.length} contract violation(s); nothing written.`);
        for (const p of problems.slice(0, 40)) console.error("  - " + p);
        if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`);
        process.exit(1);
    }

    // Deterministic order: by first source page, then name, then id.
    const cmp = (a, b) => (a.source.pages[0] - b.source.pages[0]) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    const source = {
        file: (cacheManifest && cacheManifest.source && cacheManifest.source.file) || "SRD_CC_v5.1.pdf",
        sha256: sourceHash || (cacheManifest && cacheManifest.source && cacheManifest.source.sha256) || null,
        pages: S.SOURCE_PAGES,
        extraction: cacheManifest ? { generator: cacheManifest.generator, generatedAt: cacheManifest.generatedAt, tool: cacheManifest.tool && `${cacheManifest.tool.name} ${cacheManifest.tool.version}` } : null
    };
    const totals = { entries: 0, byKind: {}, byReadiness: {} };
    const categories = [];
    const files = {};
    for (const [cat, file] of Object.entries(S.CATEGORIES)) {
        const bucket = byCategory[cat];
        bucket.entries.sort(cmp);
        const counts = { entries: bucket.entries.length, byKind: {}, byReadiness: {} };
        for (const e of bucket.entries) {
            counts.byKind[e.kind] = (counts.byKind[e.kind] || 0) + 1;
            counts.byReadiness[e.readiness] = (counts.byReadiness[e.readiness] || 0) + 1;
            totals.byKind[e.kind] = (totals.byKind[e.kind] || 0) + 1;
            totals.byReadiness[e.readiness] = (totals.byReadiness[e.readiness] || 0) + 1;
        }
        totals.entries += counts.entries;
        const content = {
            metadata: {
                schemaVersion: S.SCHEMA_VERSION,
                generator: "tools/build_srd_catalog.js",
                category: cat,
                file,
                dormant: true,
                note: "Staged SRD 5.1 content. Not loaded by any plugin; entries reach gameplay only through an explicit adaptation task. See docs/SRD5_1_COVERAGE_MANIFEST.md.",
                source,
                license: S.LICENSE,
                stagingSources: bucket.stagingSources,
                counts
            },
            entries: bucket.entries,
            warnings: bucket.warnings
        };
        categories.push({ category: cat, file, entries: counts.entries, byKind: counts.byKind, byReadiness: counts.byReadiness, warnings: bucket.warnings.length });
        files[cat] = file;
        if (!dryRun) {
            fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(path.join(outDir, file), JSON.stringify(content, null, 1) + "\n", "utf8");
        }
    }
    const manifest = {
        schemaVersion: S.SCHEMA_VERSION,
        generator: "tools/build_srd_catalog.js",
        generatedAt: new Date().toISOString(),
        dormant: true,
        note: "Dormant SRD 5.1 content library: complete, source-accurate data staged for later adaptation. Nothing in this folder is loaded by the game (docs/SRD5_1_COVERAGE_MANIFEST.md section 9).",
        source,
        license: S.LICENSE,
        contract: "docs/SRD5_1_COVERAGE_MANIFEST.md",
        files,
        categories,
        totals,
        kinds: Object.fromEntries(Object.entries(S.KINDS).map(([k, v]) => [k, { category: v.category, icon: v.icon }])),
        readiness: S.READINESS,
        staging: stagingSummary,
        warnings: categories.reduce((s, c) => s + c.warnings, 0)
    };
    if (!dryRun) fs.writeFileSync(path.join(outDir, "catalogue_manifest.json"), JSON.stringify(manifest, null, 1) + "\n", "utf8");

    console.log(`build_srd_catalog: ${totals.entries} entries from ${stagingFiles.length} staging file(s)${dryRun ? " (dry run, nothing written)" : ` -> ${path.relative(ROOT, outDir)}`}`);
    for (const c of categories) console.log(`  ${c.category.padEnd(18)} ${String(c.entries).padStart(4)}  ${Object.entries(c.byKind).map(([k, n]) => `${k} ${n}`).join(", ")}  | readiness ${Object.entries(c.byReadiness).map(([k, n]) => `${k} ${n}`).join(", ")}${c.warnings ? ` | ${c.warnings} warnings` : ""}`);
    console.log(`  totals: ${Object.entries(totals.byReadiness).map(([k, n]) => `${k} ${n}`).join(", ")}; staging warnings ${manifest.warnings}`);
}

main();
