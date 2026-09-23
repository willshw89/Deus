// tools/srd_extract/extract_pages.js - SRD 5.1 PDF -> per-page text cache.
//
// Usage: node tools/srd_extract/extract_pages.js [--pdf <file>] [--out <dir>] [--pdftotext <exe>]
//                                                [--allow-hash-mismatch] [--check]
//
// Runs pdftotext (xpdf; Git for Windows ships it at C:\Program Files\Git\mingw64\bin) twice over the
// whole document, once in reading order and once with -layout, splits both on the form feeds
// pdftotext puts between pages, normalises the text (lib/srd_text.js NORMALIZATION_RULES), strips the
// running footer and writes:
//   <out>/page_NNN.txt         reading order, one file per page (paragraph text)
//   <out>/page_NNN.layout.txt  physical layout, one file per page (tables, stat-block columns)
//   <out>/manifest.json        source hash, tool version, rules applied, per-page footer check
//   <out>/sections.json        the document's section map (page ranges verified by inspection)
//   <out>/headings.json        heading candidates per page (an aid for the stagers)
// --check re-extracts and compares with the cache without writing; exit 1 if anything differs.
// Exit codes: 0 ok, 1 a verification problem (page count, footer numbers, --check diff), 2 tool or input missing.
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const T = require("./lib/srd_text");

const ROOT = path.resolve(__dirname, "..", "..");
const EXPECTED_SHA256 = "2504d2a0abb0a4d491a939be4f17910a2dde0312570ab8d208080225ccf0a1f0"; // SRD_CC_v5.1.pdf, 403 pages
const EXPECTED_PAGES = 403;

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const pdfPath = path.resolve(opt("--pdf", path.join(ROOT, "SRD_CC_v5.1.pdf")));
const outDir = path.resolve(opt("--out", path.join(__dirname, "cache")));
const allowHashMismatch = args.includes("--allow-hash-mismatch");
const checkOnly = args.includes("--check");

/**
 * The section map. Page ranges were verified on 2026-09-22 by reading the first lines of every
 * boundary page of the extraction (not taken from a table of contents: the PDF has none).
 * `category` is the browser category; `kind` hints which stager owns the range.
 */
const SECTIONS = [
    { id: "legal", title: "Legal Information", pages: [1, 1], category: "meta", kind: "legal" },
    { id: "races", title: "Races", pages: [3, 7], category: "character-options", kind: "race" },
    { id: "classes", title: "Classes", pages: [8, 55], category: "character-options", kind: "class" },
    { id: "beyond-1st-level", title: "Beyond 1st Level (multiclassing, alignment, languages, inspiration, backgrounds)", pages: [56, 61], category: "character-options", kind: "advancement" },
    { id: "equipment", title: "Equipment", pages: [62, 74], category: "equipment", kind: "equipment" },
    { id: "feats", title: "Feats", pages: [75, 75], category: "character-options", kind: "feat" },
    { id: "using-ability-scores", title: "Using Ability Scores", pages: [76, 83], category: "rules", kind: "rule" },
    { id: "adventuring", title: "Adventuring", pages: [84, 89], category: "rules", kind: "rule" },
    { id: "combat", title: "Combat", pages: [90, 99], category: "rules", kind: "rule" },
    { id: "spellcasting", title: "Spellcasting", pages: [100, 104], category: "rules", kind: "rule" },
    { id: "spell-lists", title: "Spell Lists", pages: [105, 113], category: "spells", kind: "spell-list" },
    { id: "spell-descriptions", title: "Spell Descriptions", pages: [114, 194], category: "spells", kind: "spell" },
    { id: "traps", title: "Traps", pages: [195, 198], category: "rules", kind: "hazard" },
    { id: "diseases", title: "Diseases", pages: [199, 200], category: "rules", kind: "hazard" },
    { id: "madness", title: "Madness", pages: [201, 202], category: "rules", kind: "hazard" },
    { id: "objects", title: "Objects", pages: [203, 203], category: "rules", kind: "rule" },
    { id: "poisons", title: "Poisons", pages: [204, 205], category: "rules", kind: "hazard" },
    { id: "magic-items", title: "Magic Items", pages: [206, 253], category: "magic-items", kind: "magic-item" },
    { id: "monsters-intro", title: "Monsters (stat block rules)", pages: [254, 260], category: "rules", kind: "rule" },
    { id: "monsters", title: "Monsters (A to Z)", pages: [261, 357], category: "creatures", kind: "creature" },
    { id: "appendix-ph-a", title: "Appendix PH-A: Conditions", pages: [358, 359], category: "rules", kind: "condition" },
    { id: "appendix-ph-b", title: "Appendix PH-B: Fantasy-Historical Pantheons", pages: [360, 362], category: "rules", kind: "appendix" },
    { id: "appendix-ph-c", title: "Appendix PH-C: The Planes of Existence", pages: [363, 365], category: "rules", kind: "appendix" },
    { id: "appendix-mm-a", title: "Appendix MM-A: Miscellaneous Creatures", pages: [366, 394], category: "creatures", kind: "creature" },
    { id: "appendix-mm-b", title: "Appendix MM-B: Nonplayer Characters", pages: [395, 403], category: "creatures", kind: "creature" }
];

function findPdftotext() {
    const candidates = [
        opt("--pdftotext", null),
        process.env.PDFTOTEXT,
        "pdftotext",
        "C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe",
        "C:\\Program Files\\Git\\usr\\bin\\pdftotext.exe"
    ].filter(Boolean);
    for (const c of candidates) {
        const r = spawnSync(c, ["-v"], { encoding: "utf8" });
        if (!r.error && (r.stdout + r.stderr).includes("pdftotext")) {
            const m = (r.stdout + r.stderr).match(/pdftotext version ([^\s]+)/);
            return { exe: c, version: m ? m[1] : "unknown" };
        }
    }
    return null;
}

function sha256(file) {
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function runPdftotext(exe, mode) {
    const tmp = path.join(os.tmpdir(), `srd_extract_${process.pid}_${mode}.txt`);
    const flags = ["-enc", "UTF-8", "-eol", "unix"];
    if (mode === "layout") flags.push("-layout");
    const r = spawnSync(exe, [...flags, pdfPath, tmp], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error || r.status !== 0) throw new Error(`pdftotext (${mode}) failed: ${r.error ? r.error.message : r.stderr}`);
    const text = fs.readFileSync(tmp, "utf8");
    fs.rmSync(tmp, { force: true });
    const warnings = (r.stderr || "").split(/\r?\n/).filter(Boolean);
    return { text, warnings };
}

function splitPages(text) {
    const pages = text.split("\f");
    if (pages.length && pages[pages.length - 1].trim() === "") pages.pop();
    return pages;
}

function pad(n) { return String(n).padStart(3, "0"); }

function main() {
    if (!fs.existsSync(pdfPath)) {
        console.error(`SRD extract: PDF not found at ${pdfPath}`);
        process.exit(2);
    }
    const tool = findPdftotext();
    if (!tool) {
        console.error("SRD extract: pdftotext not found. Git for Windows ships it at C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe; pass --pdftotext <exe> or set PDFTOTEXT.");
        process.exit(2);
    }
    const hash = sha256(pdfPath);
    if (hash !== EXPECTED_SHA256) {
        console.error(`SRD extract: ${path.basename(pdfPath)} sha256 ${hash} differs from the expected ${EXPECTED_SHA256}.`);
        if (!allowHashMismatch) process.exit(2);
        console.error("           continuing because --allow-hash-mismatch was given; the manifest records the actual hash.");
    }

    const ro = runPdftotext(tool.exe, "reading");
    const lo = runPdftotext(tool.exe, "layout");
    const roPages = splitPages(ro.text), loPages = splitPages(lo.text);
    const problems = [];
    if (roPages.length !== loPages.length) problems.push(`page counts differ: reading order ${roPages.length}, layout ${loPages.length}`);
    if (roPages.length !== EXPECTED_PAGES) problems.push(`expected ${EXPECTED_PAGES} pages, pdftotext produced ${roPages.length}`);

    const pages = [];
    const headings = {};
    let footerMismatches = 0;
    for (let i = 0; i < roPages.length; i++) {
        const n = i + 1;
        const r = T.stripFooter(T.normalizeText(roPages[i]));
        const l = T.stripFooter(T.normalizeText(loPages[i] || ""));
        const footerPage = r.footerPage !== null ? r.footerPage : l.footerPage;
        if (footerPage !== null && footerPage !== n) footerMismatches++;
        pages.push({
            page: n,
            footerPage,
            chars: r.text.length,
            layoutChars: l.text.length,
            firstLine: (r.text.split("\n").map(s => s.trim()).find(Boolean) || "").slice(0, 120),
            reading: r.text,
            layout: l.text
        });
        headings[n] = T.headingCandidates(r.text).map(h => h.text);
    }
    if (footerMismatches > 0) problems.push(`${footerMismatches} pages whose printed footer number differs from their index`);

    const manifest = {
        generator: "tools/srd_extract/extract_pages.js",
        generatedAt: new Date().toISOString(),
        source: { file: path.relative(ROOT, pdfPath).replace(/\\/g, "/"), sha256: hash, expectedSha256: EXPECTED_SHA256, bytes: fs.statSync(pdfPath).size, pages: roPages.length },
        license: {
            id: "CC-BY-4.0",
            attribution: "This work includes material taken from the System Reference Document 5.1 (\u201cSRD 5.1\u201d) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode."
        },
        tool: { name: "pdftotext (xpdf)", exe: tool.exe, version: tool.version, modes: ["reading order (-enc UTF-8 -eol unix)", "layout (-layout -enc UTF-8 -eol unix)"] },
        toolWarnings: { count: ro.warnings.length + lo.warnings.length, distinct: [...new Set([...ro.warnings, ...lo.warnings])] },
        normalization: T.NORMALIZATION_RULES,
        footer: "the running footer 'System Reference Document 5.1' and the page number are removed from every page; footerPage records the number that was printed",
        sections: SECTIONS,
        pages: pages.map(p => ({ page: p.page, footerPage: p.footerPage, chars: p.chars, layoutChars: p.layoutChars, firstLine: p.firstLine })),
        problems
    };

    if (checkOnly) {
        let diffs = 0;
        for (const p of pages) {
            const f1 = path.join(outDir, `page_${pad(p.page)}.txt`), f2 = path.join(outDir, `page_${pad(p.page)}.layout.txt`);
            if (!fs.existsSync(f1) || fs.readFileSync(f1, "utf8") !== p.reading + "\n") diffs++;
            if (!fs.existsSync(f2) || fs.readFileSync(f2, "utf8") !== p.layout + "\n") diffs++;
        }
        console.log(`SRD extract --check: ${pages.length} pages re-extracted, ${diffs} cached files differ, ${problems.length} problems${problems.length ? ": " + problems.join("; ") : ""}`);
        process.exit(diffs === 0 && problems.length === 0 ? 0 : 1);
    }

    fs.mkdirSync(outDir, { recursive: true });
    // Write a file only when its content changed: re-runs leave untouched pages alone (no churn for git, and
    // a stager reading the cache during a re-run only ever sees complete files).
    let written = 0;
    const writeIfChanged = (file, content) => {
        if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return;
        fs.writeFileSync(file, content, "utf8");
        written++;
    };
    for (const p of pages) {
        writeIfChanged(path.join(outDir, `page_${pad(p.page)}.txt`), p.reading + "\n");
        writeIfChanged(path.join(outDir, `page_${pad(p.page)}.layout.txt`), p.layout + "\n");
    }
    fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
    writeIfChanged(path.join(outDir, "sections.json"), JSON.stringify({ source: manifest.source, sections: SECTIONS }, null, 2) + "\n");
    writeIfChanged(path.join(outDir, "headings.json"), JSON.stringify(headings, null, 1) + "\n");

    const totalChars = pages.reduce((s, p) => s + p.chars, 0);
    console.log(`SRD extract: ${pages.length} pages -> ${path.relative(ROOT, outDir)} (${totalChars.toLocaleString()} chars reading order); ${written} files written or changed; pdftotext ${tool.version}; ${manifest.toolWarnings.count} tool warnings (${manifest.toolWarnings.distinct.length} distinct); footer mismatches ${footerMismatches}`);
    if (problems.length) {
        console.error(`SRD extract: PROBLEMS: ${problems.join("; ")}`);
        process.exit(1);
    }
}

main();
