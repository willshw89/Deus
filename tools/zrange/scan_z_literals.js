#!/usr/bin/env node
"use strict";
/**
 * tools/zrange/scan_z_literals.js (WG.00.17, lane AA): the static half of test_zrange's single_authority check.
 *
 * Scans the 22 plugins of the lane's write set for Z-range literals: level bounds (a level compared with -2/+2 or
 * -3/+3), "z + 2" slots, five-level lists and caches, elevation caps (24/25), fixed Z constants, "-2".."+2" level keys
 * and texts that name the five-level range. Every hit must be covered by an entry of the allow-list
 * (tools/zrange/z_literal_allowlist.json: file, a substring of the line, the reason), and every allow-list entry must
 * still match a line (a stale entry is a failure too). So a literal put back anywhere fails the scan.
 *
 * Usage: node tools/zrange/scan_z_literals.js [--root <repo or snapshot root>] [--json] [--list]
 *   --root  where game/js/plugins is (default: this repo)
 *   --list  print every hit with its allow-list reason
 * Exit: 0 every hit allowed and no stale entry; 1 otherwise; 2 harness problem.
 */
const fs = require("fs");
const path = require("path");

const FILES = ["DEUS_Levels", "DEUS_World", "DEUS_Fluid", "DEUS_WorldGen", "DEUS_Minimap", "DEUS_Depth", "DEUS_Environment", "DEUS_DayNight",
    "DEUS_Ecology", "DEUS_Wildlife", "DEUS_History", "DEUS_Colonists", "DEUS_Doors", "DEUS_Fire", "DEUS_Floors", "DEUS_Items", "DEUS_Jobs",
    "DEUS_Objects", "DEUS_Ownership", "DEUS_Walls", "UF_Households", "DEUS_HistoricalDemographics"].map(n => `${n}.js`);

// A level-valued expression: z-like names and .z members.
const ZX = String.raw`(?:\b(?:z|zz|nz|qZ|zLevel|zf|zVal|lz|curZ|targetZ|toZ|fromZ|minZ|maxZ|belowZ|aboveZ|worldZ|viewZ|home[zZ]|wantZ|level)\b|\.z\b)`;
const PATTERNS = [
    { kind: "level bound", re: new RegExp(`${ZX}\\s*(?:<=|>=|<|>|===|!==|==|!=)\\s*[-+]?[23]\\b(?!\\.\\d)`) },
    { kind: "level bound", re: new RegExp(`(?<![\\w.])[-+]?[23]\\s*(?:<=|>=|<|>|===|!==)\\s*${ZX}`) },
    { kind: "z + 2 slot", re: new RegExp(`${ZX}\\s*[+-]\\s*2\\s*[\\])*]`) },
    { kind: "z + 2 slot", re: /\(\s*(?:[\w.]*[zZ]\w*)\s*\+\s*2\s*\)/ },
    { kind: "level list", re: /\[\s*-?[0-2]\s*,\s*-?[0-2]\s*,\s*-?[0-2]\s*,\s*-?[0-2]\s*,\s*-?[0-2]\s*\]/ },
    { kind: "level list", re: /\[\s*(?:0\s*,\s*)?-1\s*,\s*-2\s*\]|\[\s*-2\s*,\s*-1\s*\]/ },
    { kind: "level clamp", re: /Math\.(?:max|min)\(\s*[-+]?2\s*,\s*Math\.(?:max|min)\(/ },
    { kind: "level clamp", re: /Math\.max\(\s*-2\s*,|Math\.min\(\s*2\s*,\s*[\w.]*[zZ]/ },
    { kind: "elevation cap", re: /Math\.min\(\s*24\s*,|\bE_TOP\b|elevations? 0\.\.24|0\.\.24/ },
    { kind: "Z constant", re: /\bZ_(?:MIN|MAX|LEVELS|COUNT)\b|\bLEVEL_KEY\b|\bLABELS\b/ },
    { kind: "5-slot array", re: /\[\s*null\s*,\s*null\s*,\s*null\s*,\s*null\s*,\s*null\s*\]|\[\s*0\s*,\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*\]\.map|new Map\(\)\s*,\s*new Map\(\)\s*,\s*new Map\(\)\s*,\s*new Map\(\)\s*,\s*new Map\(\)/ },
    { kind: "5-slot index", re: /\bli\s*<\s*5\b|\*\s*5\s*\+\s*\(?\s*(?:li|z)\b|ai\s*\*\s*5\b/ },
    { kind: "elevation to level", re: /\/\s*STRATA\)?\s*\|\s*0\)?\s*-\s*2\b|Math\.floor\(\s*e\s*\/\s*STRATA\s*\)\s*-\s*2/ },
    { kind: "level key", re: /levels\s*\[\s*"-?[0-9]"\s*\]|\[\s*"-?2"\s*\]|"-2"\s*:|\b2\s*:\s*"\+2"/ },
    { kind: "range literal", re: /\bz(?:Min|Max)\s*:\s*[-+]?\d+/ },
    { kind: "level argument", re: /\bz\s*:\s*-2\b|[(,]\s*-2\s*[,)]|\?\s*-2\s*:/ },
    { kind: "five-level text", re: /-2\s*(?:\.\.|to)\s*\+?2\b|\+2 to -2|\bfive (?:persistent )?levels\b|\b5 (?:persistent )?(?:Z-)?levels\b|\ball five\b|\(-2\.\.2\)|\bsixth level\b/i }
];

function scan(root) {
    const dir = path.join(root, "game", "js", "plugins");
    const hits = [];
    for (const f of FILES) {
        const p = path.join(dir, f);
        if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
        const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
        lines.forEach((text, i) => {
            const kinds = PATTERNS.filter(q => q.re.test(text)).map(q => q.kind);
            if (kinds.length) hits.push({ file: f, line: i + 1, kinds: [...new Set(kinds)], text: text.trim() });
        });
    }
    return hits;
}

function loadAllow(file) {
    const list = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(list.entries)) throw new Error("allow-list has no entries");
    for (const e of list.entries) if (!e.file || !e.match || !e.reason) throw new Error(`allow-list entry without file/match/reason: ${JSON.stringify(e)}`);
    return list.entries;
}

function judge(hits, allow) {
    const used = new Array(allow.length).fill(0);
    const bad = [];
    for (const h of hits) {
        const k = allow.findIndex(e => e.file === h.file && h.text.includes(e.match));
        if (k < 0) bad.push(h);
        else { used[k]++; h.reason = allow[k].reason; h.class = allow[k].class || ""; }
    }
    const stale = allow.filter((e, k) => used[k] === 0);
    return { hits: hits.length, allowed: hits.length - bad.length, bad, stale, entries: allow.length };
}

module.exports = { scan, loadAllow, judge, FILES, PATTERNS };

if (require.main === module) {
    const args = process.argv.slice(2);
    const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
    const root = path.resolve(opt("--root", path.join(__dirname, "..", "..")));
    let r, hits;
    try {
        hits = scan(root);
        r = judge(hits, loadAllow(opt("--allow", path.join(__dirname, "z_literal_allowlist.json"))));
    } catch (e) { console.error(`HARNESS: ${e.message}`); process.exit(2); }
    if (args.includes("--json")) { console.log(JSON.stringify({ root, ...r, list: hits }, null, 1)); process.exit(r.bad.length || r.stale.length ? 1 : 0); }
    if (args.includes("--list")) for (const h of hits) console.log(`${h.file}:${h.line} [${h.kinds.join(", ")}] ${h.reason ? `ALLOWED (${h.class}) ${h.reason}` : "NOT ALLOWED"} :: ${h.text.slice(0, 160)}`);
    for (const h of r.bad) console.log(`LITERAL ${h.file}:${h.line} [${h.kinds.join(", ")}] ${h.text.slice(0, 200)}`);
    for (const e of r.stale) console.log(`STALE allow-list entry ${e.file} "${e.match}" (matches no line)`);
    console.log(`scan: ${r.hits} line(s) with a Z-range pattern in ${FILES.length} plugins under ${root}; ${r.allowed} allowed by ${r.entries} allow-list entries; ${r.bad.length} not allowed; ${r.stale.length} stale entries`);
    process.exit(r.bad.length || r.stale.length ? 1 : 0);
}
