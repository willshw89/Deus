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
const verificationPath = path.resolve(opt("--verification", path.join(__dirname, "srd_extract", "verification", "verified.json")));
const dryRun = args.includes("--dry-run");

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}
const sha256 = s => require("crypto").createHash("sha256").update(String(s), "utf8").digest("hex");

/**
 * Verification overlay: tools/srd_extract/verification/verified.json lists entries a reviewer compared with the
 * rendered source page: { records: [{ id, verifiedBy, verifiedAt, method, pages, textSha256, notes }] }. The mark is
 * applied only while the entry's text still hashes to textSha256; a re-parsed entry drops back to "parsed" and
 * the manifest lists it under staleVerifications, so a stager change can never carry a stale mark forward.
 */
function loadVerification() {
    if (!fs.existsSync(verificationPath)) return { records: new Map(), stale: [] };
    const v = readJson(verificationPath);
    const records = new Map();
    for (const r of (v.records || [])) if (r && r.id) records.set(r.id, r);
    return { records, stale: [] };
}

/**
 * Table overlays: tools/srd_extract/verification/table_overlays.json completes tables a stager refused to reconstruct,
 * from a reviewer's reading of the rendered page. Two forms, both bound to the staging text's sha256:
 *   rows:    the cells transcribed; every word of every cell must occur in the entry's own text (a typo is refused).
 *   anchors: for long dice tables whose outcome text the entry already holds as printed lines: the roll labels in
 *            order with the first words of each outcome; the outcome text is sliced from the entry's text between
 *            consecutive anchors, so nothing is transcribed and nothing can be invented.
 * The table's printed lines in `text` are replaced by one line per row. A refused overlay is listed in the manifest.
 */
const overlayPath = path.resolve(opt("--table-overlays", path.join(__dirname, "srd_extract", "verification", "table_overlays.json")));
function loadTableOverlays() {
    if (!fs.existsSync(overlayPath)) return { records: [], refused: [], applied: 0 };
    const v = readJson(overlayPath);
    return { records: Array.isArray(v.records) ? v.records : [], refused: [], applied: 0 };
}
const fold = s => require("./srd_extract/lib/srd_text").toPlain(String(s)).toLowerCase().replace(/\s+/g, " ").trim();
function rollOf(label) {
    const m = String(label).match(/^(\d{1,3})(?:\s*[–—-]\s*(\d{1,3}))?$/);
    if (!m) return null;
    const a = parseInt(m[1], 10), b = m[2] === undefined ? a : parseInt(m[2], 10);
    return { min: a === 0 ? 100 : a, max: b === 0 ? 100 : b, text: String(label) };
}
function coverageOf(rows, dice) {
    if (!dice) return null;
    const n = parseInt(String(dice).replace(/^d/, ""), 10);
    const hits = new Array(n + 1).fill(0);
    for (const r of rows) if (r.roll) for (let k = r.roll.min; k <= r.roll.max; k++) if (k >= 1 && k <= n) hits[k]++;
    const gaps = [], overlaps = [];
    for (let k = 1; k <= n; k++) { if (hits[k] === 0) gaps.push(k); if (hits[k] > 1) overlaps.push(k); }
    return { complete: gaps.length === 0 && overlaps.length === 0, gaps, overlaps };
}
function applyTableOverlay(e, ov, refused) {
    const refuse = reason => { refused.push({ id: e.id, table: ov.table, reason }); return e; };
    if (ov.textSha256 !== sha256(e.text)) return refuse("staging text changed since the overlay was reviewed");
    const tables = e.data && Array.isArray(e.data.tables) ? e.data.tables : null;
    const t = tables && tables[ov.table];
    if (!t) return refuse(`table ${ov.table} not found`);
    if (Array.isArray(t.rows) && t.rows.length && !t.unparsed) return refuse("table already has rows");
    const columns = ov.columns || t.columns;
    let rows;
    const words = new Set(fold(e.text).split(/[^a-z0-9+/.'-]+/).filter(Boolean));
    if (Array.isArray(ov.rows)) {
        for (const r of ov.rows) for (const c of r.cells) for (const w of fold(c).split(/[^a-z0-9+/.'-]+/).filter(Boolean)) if (!words.has(w)) return refuse(`cell word "${w}" does not occur in the entry text`);
        rows = ov.rows.map(r => ({ roll: r.roll || (r.label ? rollOf(r.label) : null), cells: r.cells }));
    } else if (Array.isArray(ov.anchors)) {
        const headerRe = new RegExp("^" + columns.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+") + "\\s*$", "m");
        const hm = headerRe.exec(e.text);
        if (!hm) return refuse("table header line not found in the entry text");
        const startBlock = hm.index;
        let endBlock = e.text.length;
        if (ov.endAnchor) { const k = e.text.indexOf(ov.endAnchor, startBlock); if (k < 0) return refuse("endAnchor not found"); endBlock = k; }
        let block = e.text.slice(startBlock + hm[0].length, endBlock);
        // Strip the printed roll labels wherever the layout put them at a line start, then join the lines.
        const labels = ov.anchors.map(a => a.label);
        const labelRe = new RegExp("^(?:" + labels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\s+", "gm");
        block = block.replace(labelRe, "").split("\n").map(l => l.trim()).filter(Boolean).join(" ");
        const positions = [];
        let from = 0;
        for (const a of ov.anchors) {
            const k = block.indexOf(a.anchor, from);
            if (k < 0) return refuse(`anchor "${a.anchor}" not found in order`);
            positions.push(k);
            from = k + a.anchor.length;
        }
        rows = ov.anchors.map((a, i) => ({ roll: rollOf(a.label), cells: [a.label, block.slice(positions[i], i + 1 < positions.length ? positions[i + 1] : block.length).trim()] }));
        if (rows.some(r => !r.roll)) return refuse("a label is not a dice range");
        // Rewrite the printed lines as one line per row.
        const rendered = [columns.join(" | ")].concat(rows.map(r => r.cells.join(" | "))).join("\n");
        e.text = e.text.slice(0, startBlock) + rendered + (endBlock < e.text.length ? "\n\n" + e.text.slice(endBlock).replace(/^\s+/, "") : "");
    } else {
        return refuse("overlay has neither rows nor anchors");
    }
    if (Array.isArray(ov.rows) && ov.renderText !== false) {
        // Replace the printed lines of the table (from the header line to the end of the raw lines) with the rows.
        const raw = Array.isArray(t.rawLines) ? t.rawLines : [];
        const first = raw.length ? e.text.indexOf(raw[0]) : -1, last = raw.length ? e.text.indexOf(raw[raw.length - 1]) : -1;
        if (first >= 0 && last >= first) {
            const rendered = [columns.join(" | ")].concat(rows.map(r => r.cells.join(" | "))).join("\n");
            e.text = e.text.slice(0, first) + rendered + e.text.slice(last + raw[raw.length - 1].length);
        }
    }
    const dice = ov.dice !== undefined ? ov.dice : (t.dice || null);
    const done = Object.assign({}, t, { columns, rows, dice, coverage: coverageOf(rows, dice), unparsed: false, problem: undefined, rawLines: undefined,
        overlay: { reviewer: ov.reviewer, reviewedAt: ov.reviewedAt, method: ov.method, pages: ov.pages } });
    delete done.problem; delete done.rawLines;
    tables[ov.table] = done;
    e.notes = (e.notes || []).filter(n => !/rows not recoverable|not recoverable from the layout|missing required field\(s\): tables/.test(n)).concat([`table ${ov.table} completed from a reviewer overlay (${ov.method}, ${ov.reviewedAt})`]);
    if (e.readiness === "extracted" && !tables.some(x => x.unparsed) && S.REQUIRED_DATA[e.kind].every(k => e.data[k] !== undefined && e.data[k] !== null)) e.readiness = "parsed";
    return e;
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
    const verification = loadVerification();
    const overlays = loadTableOverlays();

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
            let out = Object.assign({}, e, { icon: { set: "IconSet", index: S.KINDS[e.kind].icon }, data: JSON.parse(JSON.stringify(e.data)), notes: (e.notes || []).slice() });
            const stagingHash = sha256(e.text);
            for (const ov of overlays.records.filter(o => o.id === e.id)) {
                const before = overlays.refused.length;
                out = applyTableOverlay(out, ov, overlays.refused);
                if (overlays.refused.length === before) overlays.applied++;
            }
            const v = verification.records.get(e.id);
            if (v) {
                if (v.textSha256 === stagingHash && out.readiness === "parsed") {
                    out.readiness = "verified";
                    out.verifiedBy = v.verifiedBy;
                    out.verifiedAt = v.verifiedAt;
                    out.verification = { method: v.method, pages: v.pages, textSha256: sha256(out.text), notes: v.notes || [] };
                } else {
                    verification.stale.push({ id: e.id, reason: v.textSha256 !== stagingHash ? "text changed since verification" : `readiness is ${out.readiness}, not parsed` });
                }
            }
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
        warnings: categories.reduce((s, c) => s + c.warnings, 0),
        verification: { file: path.relative(ROOT, verificationPath).replace(/\\/g, "/"), applied: totals.byReadiness.verified || 0, stale: verification.stale },
        tableOverlays: { file: path.relative(ROOT, overlayPath).replace(/\\/g, "/"), applied: overlays.applied, refused: overlays.refused }
    };
    if (verification.stale.length) console.warn(`build_srd_catalog: ${verification.stale.length} verification mark(s) not applied: ${verification.stale.map(s => `${s.id} (${s.reason})`).join("; ")}`);
    if (overlays.refused.length) console.warn(`build_srd_catalog: ${overlays.refused.length} table overlay(s) refused: ${overlays.refused.map(s => `${s.id} table ${s.table} (${s.reason})`).join("; ")}`);
    if (overlays.applied) console.log(`build_srd_catalog: ${overlays.applied} table overlay(s) applied`);
    if (!dryRun) fs.writeFileSync(path.join(outDir, "catalogue_manifest.json"), JSON.stringify(manifest, null, 1) + "\n", "utf8");

    console.log(`build_srd_catalog: ${totals.entries} entries from ${stagingFiles.length} staging file(s)${dryRun ? " (dry run, nothing written)" : ` -> ${path.relative(ROOT, outDir)}`}`);
    for (const c of categories) console.log(`  ${c.category.padEnd(18)} ${String(c.entries).padStart(4)}  ${Object.entries(c.byKind).map(([k, n]) => `${k} ${n}`).join(", ")}  | readiness ${Object.entries(c.byReadiness).map(([k, n]) => `${k} ${n}`).join(", ")}${c.warnings ? ` | ${c.warnings} warnings` : ""}`);
    console.log(`  totals: ${Object.entries(totals.byReadiness).map(([k, n]) => `${k} ${n}`).join(", ")}; staging warnings ${manifest.warnings}`);
}

main();
