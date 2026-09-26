#!/usr/bin/env node
"use strict";
/**
 * tools/zrange/literal_map.js (WG.00.17, lane AA): writes tasks/WG.00.17/lane-aa/literal_map.md, the map of the Z-range
 * literals of the 22 plugins of the lane's write set, from the repository itself (no hand-kept list):
 *   A. docs/audits/LIVING_WORLD_GAP_AUDIT.md Appendix A (line numbers at 75cf2ff3) and ADR-003 section 15.1 (the base's
 *      numbers), every line re-found at the base commit by its text, then followed to HEAD;
 *   B. every line tools/zrange/scan_z_literals.js reports at the base commit, followed to HEAD: changed (the hunk's new
 *      code and HEAD's line numbers) or kept (the allow-list's class and reason);
 *   C. every other hunk of `git diff <base> HEAD` in those plugins that removes or replaces code (the literals and
 *      assumptions the scan's patterns don't match, and the other changes of the lane), old code and new code;
 *   D. every line the scan reports at HEAD that has no counterpart at the base (the authority's data, fallbacks, ...),
 *      with the allow-list's class and reason.
 * Usage: node tools/zrange/literal_map.js [--base=<sha>] [--out=<file>] [--check]
 *   --check  exit 1 when a line of A or B can't be followed, a kept line has no allow-list reason, or the scan at HEAD
 *            isn't clean (else 0); the file is written either way.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { scan, loadAllow, judge, FILES } = require("./scan_z_literals.js");

const ROOT = path.resolve(__dirname, "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const BASE = arg("base", "5255f1a58a9d95bb7bc08377ef055c366610e486");
const AUDIT_AT = "75cf2ff3";
const OUT = path.resolve(arg("out", path.join(ROOT, "tasks", "WG.00.17", "lane-aa", "literal_map.md")));
const git = a => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], env: Object.assign({}, process.env, { MSYS_NO_PATHCONV: "1" }) });
const show = (rev, file) => { try { return git(["show", `${rev}:${file}`]).replace(/\r\n/g, "\n"); } catch (_) { return null; } };
const plug = f => `game/js/plugins/${f}`;

const HEAD = git(["rev-parse", "HEAD"]).trim();
const baseSha = git(["rev-parse", BASE]).trim();
const text = { base: {}, head: {}, audit: {} };
for (const f of FILES) { text.base[f] = show(baseSha, plug(f)); text.head[f] = show(HEAD, plug(f)); }
const lines = s => (s === null ? [] : s.split("\n"));
const L = { base: {}, head: {} };
for (const f of FILES) { L.base[f] = lines(text.base[f]); L.head[f] = lines(text.head[f]); }

//-----------------------------------------------------------------------------
// Following a base line to HEAD through the diff's hunks

const hunks = {};
for (const f of FILES) {
    const d = git(["diff", "-U0", "--no-color", baseSha, HEAD, "--", plug(f)]);
    const out = [];
    let cur = null;
    for (const line of d.split("\n")) {
        const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
        if (m) { cur = { a: +m[1], b: m[2] === undefined ? 1 : +m[2], c: +m[3], d: m[4] === undefined ? 1 : +m[4], old: [], add: [] }; out.push(cur); continue; }
        if (!cur) continue;
        if (line.startsWith("-") && !line.startsWith("---")) cur.old.push(line.slice(1));
        else if (line.startsWith("+") && !line.startsWith("+++")) cur.add.push(line.slice(1));
    }
    hunks[f] = out;
}
/** { changed: false, head } or { changed: true, hunk } for base line n of file f. */
function follow(f, n) {
    let shift = 0;
    for (const h of hunks[f]) {
        if (h.b > 0 && n >= h.a && n < h.a + h.b) return { changed: true, hunk: h };
        const before = h.b > 0 ? h.a + h.b - 1 : h.a;   // a pure addition comes after base line h.a
        if (before < n) shift += h.d - h.b;
    }
    return { changed: false, head: n + shift };
}

//-----------------------------------------------------------------------------
// The scans and the allow-list

const tmp = path.join(os.tmpdir(), `laneaa_litmap_${process.pid}`);
fs.mkdirSync(path.join(tmp, "game", "js", "plugins"), { recursive: true });
for (const f of FILES) fs.writeFileSync(path.join(tmp, "game", "js", "plugins", f), text.base[f] || "");
const baseHits = scan(tmp);
fs.rmSync(tmp, { recursive: true, force: true });
const allow = loadAllow(path.join(__dirname, "z_literal_allowlist.json"));
const headHits = scan(ROOT);
const headJudge = judge(headHits, allow);   // sets h.reason / h.class on each allowed HEAD hit
const headByLine = new Map(headHits.map(h => [`${h.file}:${h.line}`, h]));
const allowFor = (f, n) => { const t = (L.head[f][n - 1] || "").trim(); const e = allow.find(a => a.file === f && t.includes(a.match)); return e || null; };

//-----------------------------------------------------------------------------
// Formatting

const cell = s => String(s).replace(/\|/g, "\\|").replace(/`/g, "'").replace(/\s+/g, " ").trim();
const code = (s, max = 170) => { const t = cell(s); return t ? `\`${t.length > max ? `${t.slice(0, max - 1)}…` : t}\`` : ""; };
// A hunk's code lines first (its comment lines only when it has nothing else).
const codeFirst = arr => { const c = arr.filter(x => !/^\s*(\/\/|\*|\/\*)/.test(x)); return c.length ? c : arr; };
const joinCode = (arr, max = 170, n = 3) => { const a = codeFirst(arr).map(x => x.trim()).filter(Boolean); if (!a.length) return "(none)"; return a.slice(0, n).map(x => code(x, max)).join(" ⏎ ") + (a.length > n ? ` ⏎ … (${a.length - n} more line${a.length - n > 1 ? "s" : ""})` : ""); };
const range = (f, h, side) => (side === "base" ? (h.b ? `${h.a}${h.b > 1 ? `-${h.a + h.b - 1}` : ""}` : `after ${h.a}`) : (h.d ? `${h.c}${h.d > 1 ? `-${h.c + h.d - 1}` : ""}` : `(removed; after ${h.c})`));
function disposition(f, n) {
    const r = follow(f, n);
    if (r.changed) return { changed: true, at: `changed: HEAD ${f}:${range(f, r.hunk, "head")}`, now: joinCode(r.hunk.add), hunk: r.hunk };
    const e = allowFor(f, r.head);
    return { changed: false, at: `kept: HEAD ${f}:${r.head}`, now: e ? `${e.class}: ${cell(e.reason)}` : (headByLine.has(`${f}:${r.head}`) ? "NO ALLOW-LIST REASON" : "unchanged; not a Z pattern of the scan"), kept: true, allowed: !!e, headLine: r.head };
}
const problems = [];
// Source lines (A) that are unchanged at HEAD and hold no pattern of the scan, so no allow-list entry: the reason each
// stays, reviewed by hand (keyed by the base line). Most are lines inside a range the source lists.
const RANGE_1232 = "range 1232-1238 of the audit (the packed-grid cache): not Z-dependent itself; the range's Z lines (the key `ai * 5 + (z + 2)`, the `[0, 1, 2, 3, 4]` slots, `li = z + 2`) changed (section B/C)";
const RANGE_173 = "range 173-190 of ADR-003 15.1 (`getAreaData`): a field of the area record, not Z-dependent; the range's Z lines (`totalCells = Z_LEVELS * n`, `inQueue` for every level, the grids made for every level) changed";
const REVIEWED = {
    "DEUS_Levels.js:1234": RANGE_1232, "DEUS_Levels.js:1236": RANGE_1232, "DEUS_Levels.js:1237": RANGE_1232,
    "DEUS_Levels.js:2023": "genCore: a frozen generator-5 parameter (a cut's bed never carves -2's S0); its comment names the lava rule below -2, unchanged (an Owner question)",
    "DEUS_Levels.js:2128": "genCore: `bs[2]` is the ground in the generator's core frame (index z + 2 of -2..+2, frozen with generator 5)",
    "DEUS_Levels.js:2138": "genCore: `bs[4]` is +2 in the core frame; the caps made there are materialized above +2 at taller ranges (`materializeCaps`)",
    "DEUS_Levels.js:2171": "genCore: an elevation in the core frame (0..24 of -2..+2)",
    "DEUS_Levels.js:2178": "genCore: `bs[1]` is a level of the core frame (index z + 2)",
    "DEUS_Depth.js:100": "depthReach: DEUS_Depth draws at most MaxDepth (2) levels below the view (DEC-011): a depth, not a level bound",
    "DEUS_Depth.js:113": "depthReach: the MaxDepth parameter's clamp to 0..2 levels below the view (DEC-011)",
    "DEUS_WorldGen.js:638": "content: the depth band of the generated cave levels (-1 upper earth, -2 deep); the band table for the new layers is an Owner question (WG.62.02)",
    "DEUS_WorldGen.js:1444": "content: the surface generator paints the ground and the generated hills +1/+2; the layers above +2 are air, painted by DEUS_Levels' terrain generator (`levels: z => z !== 0`)",
    "DEUS_Environment.js:191": "bands: -1's temperature (upper cavern), unchanged; the layers below take -2's rule (`zLevel <= -2`; the band table is an Owner question)",
    "DEUS_Environment.js:195": "bands: the deep-cavern temperature; since WG.00.17 it applies to every level at or below -2 (`zLevel <= -2`)",
    "DEUS_Environment.js:226": "bands: +1's temperature (hills), unchanged; the layers above +2 take +2's rule (`zLevel >= 2`)",
    "DEUS_Wildlife.js:525": "content: cave herds are planned on the generated cave levels -1 and -2 (with :526)",
    "DEUS_Fluid.js:174": RANGE_173, "DEUS_Fluid.js:175": RANGE_173, "DEUS_Fluid.js:176": RANGE_173, "DEUS_Fluid.js:177": RANGE_173,
    "DEUS_Fluid.js:178": RANGE_173, "DEUS_Fluid.js:182": RANGE_173, "DEUS_Fluid.js:184": RANGE_173, "DEUS_Fluid.js:185": RANGE_173,
    "DEUS_Levels.js:1037": "sparse: the generator's dense working arrays of one core level; `seal` converts them to the chunk store and drops them when the baseline is made; a level outside the core never has them (`outerBaseline`)",
    "DEUS_World.js:605": "sparse by use: a level's map is built only for the view, its ring (z±1, z±2) and, on a load, the levels within LOAD_WARM_REACH (4) of the view; PEEK_CACHE keeps 9 builds (DEUS_ZRange.md §8)",
    "DEUS_World.js:613": "sparse by use: as :605 (the object grid of a map build)"
};

//-----------------------------------------------------------------------------
// A. The two sources

function parseAppendixA() {
    const audit = show(baseSha, "docs/audits/LIVING_WORLD_GAP_AUDIT.md") || "";
    const a = audit.indexOf("## Appendix A"), b = audit.indexOf("## Appendix B");
    const part = audit.slice(a, b), refs = [];
    for (const row of part.split("\n")) {
        const cols = row.split(/(?<!\\)\|/).map(c => c.trim());
        if (cols.length < 4) continue;
        const fm = /`([\w.]+\.js)`/.exec(cols[1]);
        if (fm && /^[\d ,-]+$/.test(cols[2])) {
            for (const tok of cols[2].split(",").map(s => s.trim()).filter(Boolean)) {
                const r = /^(\d+)(?:-(\d+))?$/.exec(tok);
                if (!r) continue;
                for (let n = +r[1]; n <= +(r[2] || r[1]); n++) refs.push({ file: fm[1], line: n, kind: cell(cols[3]), src: tok.includes("-") ? `${tok}` : "" });
            }
        } else if (/Validators/.test(cols[1])) {
            for (const m of cols[2].matchAll(/`([\w.]+\.js):(\d+)`/g)) refs.push({ file: m[1], line: +m[2], kind: "per-plugin range check" });
        }
    }
    return refs;
}
function parseAdr() {
    const adr = show(baseSha, "docs/adr/ADR-003_sim_render_split_and_lod.md") || "";
    const a = adr.indexOf("### 15.1"), b = adr.indexOf("### 15.2");
    const part = adr.slice(a, b), refs = [];
    let file = null;
    for (const m of part.matchAll(/`([\w.]+\.js):(\d+)(?:-(\d+))?`|`:(\d+)(?:-(\d+))?`/g)) {
        if (m[1]) file = m[1];
        const lo = +(m[2] || m[4]), hi = +(m[3] || m[5] || lo);
        if (!file) continue;
        for (let n = lo; n <= hi; n++) refs.push({ file, line: n, kind: "ADR-003 15.1" });
    }
    return refs;
}
/** A source line (at rev) re-found at the base: the same text, the nearest match to its number. */
function refind(rev, f, n) {
    if (!FILES.includes(f)) return null;
    const src = rev === baseSha ? L.base[f] : lines(text.audit[f] !== undefined ? text.audit[f] : (text.audit[f] = show(rev, plug(f))));
    const t = (src[n - 1] || "").trim();
    if (!t) return { text: "", base: null };
    let best = null;
    L.base[f].forEach((x, i) => { if (x.trim() === t && (best === null || Math.abs(i + 1 - n) < Math.abs(best - n))) best = i + 1; });
    return { text: t, base: best };
}
function sourceRows(refs, rev, label) {
    const rows = [], seen = new Set();
    for (const r of refs) {
        if (seen.has(`${r.file}:${r.line}`)) continue;   // a line two ranges of the source both list
        seen.add(`${r.file}:${r.line}`);
        const f = refind(rev, r.file, r.line);
        if (!f || !f.text) { rows.push(`| ${label} ${r.file}:${r.line} | ${cell(r.kind)} | (no such line at ${rev.slice(0, 8)}) | - | - |`); problems.push(`${label} ${r.file}:${r.line}: no line`); continue; }
        if (f.base === null) {
            const why = r.file === "DEUS_Depth.js" ? "not at the base: DEUS_Depth was rewritten by Lane K (WG.00.09b, DEC-011 flat 1:1) before the base; the 6 ft level and the depth projection are gone" : "not found at the base by its text";
            rows.push(`| ${label} ${r.file}:${r.line} | ${cell(r.kind)} | ${code(f.text)} | ${why} | - |`);
            if (r.file !== "DEUS_Depth.js") problems.push(`${label} ${r.file}:${r.line}: not re-found`);
            continue;
        }
        const d = disposition(r.file, f.base);
        const reviewed = REVIEWED[`${r.file}:${f.base}`];
        if (d.kept && !d.allowed && reviewed) d.now = `${cell(reviewed)} (reviewed)`;
        else if (d.kept && !d.allowed) problems.push(`${label} ${r.file}:${r.line} kept without an allow-list reason`);
        rows.push(`| ${label} ${r.file}:${r.line} → base :${f.base} | ${cell(r.kind)} | ${code(f.text)} | ${d.at} | ${d.now} |`);
    }
    return rows;
}

//-----------------------------------------------------------------------------
// The file

const out = [];
out.push("# WG.00.17 lane AA: the Z-range literal map");
out.push("");
out.push(`Generated by \`node tools/zrange/literal_map.js\` on ${new Date().toISOString().slice(0, 10)}. Base \`${baseSha}\`, HEAD \`${HEAD}\` (the commit the table was made from: the file itself is committed after it). Every line number below is at the base unless it says HEAD. Code is trimmed to 170 characters; \`⏎\` separates the lines of a hunk.`);
out.push("");
out.push("How to read it:");
out.push("- **changed**: the base line is inside a hunk of `git diff <base> HEAD`. The HEAD lines and the new code are the hunk's.");
out.push("- **kept**: the line is unchanged at HEAD. The last column gives the allow-list class and reason (`tools/zrange/z_literal_allowlist.json`), the same reason the `single_authority` scan applies.");
out.push("- The allow-list classes:");
out.push("  - `authority`: the range's own data in DEUS_World.");
out.push("  - `fallback`: the legacy range for a plugin loaded without the World authority.");
out.push("  - `genCore`: the generator's frozen core frame, -2..+2.");
out.push("  - `lava` and `pools`: the -2 lava rule and the pools, unchanged (an Owner question).");
out.push("  - `content`: content tied to the generated levels (the band table is an Owner question).");
out.push("  - `bands`: DEUS_Environment's temperatures.");
out.push("  - `depthReach`: DEUS_Depth draws at most 2 levels below the view.");
out.push("  - `depthFixture` and `fixture`: test fixtures built on the core levels.");
out.push("  - `groundKey`: the pre-V80 ground key.");
out.push("  - `provoke`: a test provocation.");
out.push("  - `doc`: text naming the legacy range.");
out.push("  - `notZ`: not a level.");
out.push("");
const appA = parseAppendixA(), adr = parseAdr();
out.push(`## A. The sources: gap audit Appendix A (${appA.length} lines at \`${AUDIT_AT}\`) and ADR-003 15.1 (${adr.length} lines)`);
out.push("");
out.push("| Source line | Kind | Code (at the source's commit) | At HEAD | New code, or the reason it stays |");
out.push("|---|---|---|---|---|");
out.push(...sourceRows(appA, git(["rev-parse", AUDIT_AT]).trim(), "App. A"));
out.push(...sourceRows(adr, baseSha, "ADR 15.1"));
out.push("");

out.push(`## B. Every Z pattern of the scan at the base (${baseHits.length} lines)`);
out.push("");
out.push("`tools/zrange/scan_z_literals.js` patterns: level bounds against ±2/±3, `z + 2` slots, five-level lists and caches, the elevation cap 24/25, fixed Z constants, level keys, range literals, `-2` level arguments and five-level texts.");
out.push("");
out.push("| Base line | Pattern | Old code | At HEAD | New code, or the reason it stays |");
out.push("|---|---|---|---|---|");
const baseKeys = new Set();
let nChanged = 0, nKept = 0;
for (const h of baseHits) {
    const d = disposition(h.file, h.line);
    if (d.changed) { nChanged++; d.hunk.inB = true; } else { nKept++; baseKeys.add(`${h.file}:${d.headLine}`); if (!d.allowed) problems.push(`B ${h.file}:${h.line} kept without an allow-list reason`); }
    out.push(`| ${h.file}:${h.line} | ${h.kinds.join(", ")} | ${code(h.text)} | ${d.at} | ${d.now} |`);
}
out.push("");
out.push(`${nChanged} changed, ${nKept} kept (each with its allow-list reason).`);
out.push("");

out.push("## C. The other replaced code, hunk by hunk");
out.push("");
out.push("Every hunk of `git diff <base> HEAD` in the 22 plugins that removes or replaces base lines and holds none of the lines of B. These are literals and assumptions the scan's patterns don't match: `5` level counts, `Z_MIN`/`Z_MAX`, fixed caches, feet, `li < 5` loops, dense stores, and so on. Hunks that only add code, such as the sparse store and the range authority, are counted at the end of each file.");
out.push("");
out.push("| File | Base lines | Old code | HEAD lines | New code |");
out.push("|---|---|---|---|---|");
const addOnly = {};
for (const f of FILES) {
    for (const h of hunks[f]) {
        if (!h.b) { addOnly[f] = (addOnly[f] || 0) + h.d; continue; }
        if (h.inB) continue;
        out.push(`| ${f} | ${range(f, h, "base")} | ${joinCode(h.old)} | ${range(f, h, "head")} | ${joinCode(h.add)} |`);
    }
}
out.push("");
out.push(`Hunks that only add lines (no base line replaced): ${Object.entries(addOnly).map(([f, n]) => `${f} ${n} line(s)`).join("; ") || "none"}.`);
out.push("");

out.push("## D. Z patterns at HEAD without a counterpart at the base");
out.push("");
out.push("Lines the scan reports at HEAD that are new, such as the authority's data and the fallbacks. Each is allowed with the reason given.");
out.push("");
out.push("| HEAD line | Pattern | Code | Class: reason |");
out.push("|---|---|---|---|");
for (const h of headHits) {
    if (baseKeys.has(`${h.file}:${h.line}`)) continue;
    out.push(`| ${h.file}:${h.line} | ${h.kinds.join(", ")} | ${code(h.text)} | ${h.reason ? `${h.class}: ${cell(h.reason)}` : "NOT ALLOWED"} |`);
    if (!h.reason) problems.push(`D ${h.file}:${h.line} not allowed`);
}
out.push("");
out.push(`Scan at HEAD: ${headJudge.hits} lines with a Z pattern, ${headJudge.allowed} allowed by ${headJudge.entries} allow-list entries, ${headJudge.bad.length} not allowed, ${headJudge.stale.length} stale entries.`);
if (headJudge.bad.length || headJudge.stale.length) problems.push(`scan at HEAD: ${headJudge.bad.length} not allowed, ${headJudge.stale.length} stale`);
out.push("");
out.push("## E. Feet conversions (DEC-013 item 2; Owner fact 2)");
out.push("");
out.push("The BRIEF names these three places. Each is followed from the base line above:");
out.push("");
out.push("| Place | Base | Before | After |");
out.push("|---|---|---|---|");
out.push("| `Z_STEP_FEET` | `DEUS_World.js` (UF.Space) | 5 | 10, derived as `STRATA_PER_LAYER` (5) × `STRATUM_FEET` (2); `STRATUM_FEET` is new; `rulesDistanceFeet` uses `Z_STEP_FEET` for a level apart instead of `dz * 5` |");
out.push("| Stratum comments and the sphere math of `applyVolumeDamage` | `DEUS_Levels.js` | 1 ft strata: a stratum's middle at `e + 0.5` ft | 2 ft strata: `(e + 0.5) × STRATUM_FEET` ft, the elevation window `floor((pe ± radius) / STRATUM_FEET)`; `CELL_FT` and `STRATUM_FT` read from `UF.Space` |");
out.push("| The \"6 ft level\" of `DEUS_Depth.js` | not at the base | the audit's lines 164-205 at `75cf2ff3` | Lane K (WG.00.09b, DEC-011) removed the projection and its level height before the base; nothing to convert (section A) |");
out.push("");
out.push("Fixture: `tools/zrange/blast_tables.js` computes, from the geometry alone, which strata a 3, 5 or 7 ft sphere destroys at 1 ft and at 2 ft a stratum. `feet_2ft_10ft` (`tools/test_zrange.js`) requires the base commit's blast to equal the 1 ft table (7, 15 and 51 strata) and HEAD's the 2 ft table (3, 9 and 27) at every range. Clearance (`continuousAirHeight`, `airRunAt`) and cap thickness stay strata counts; `× STRATUM_FEET` gives feet.");
out.push("");
if (problems.length) { out.push("## Problems found by the generator"); out.push(""); for (const p of problems) out.push(`- ${p}`); out.push(""); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join("\n"));
console.log(`wrote ${path.relative(ROOT, OUT)}: A ${appA.length} + ${adr.length} source lines, B ${baseHits.length} base hits (${nChanged} changed, ${nKept} kept), D ${headHits.length - baseKeys.size} new HEAD hits; ${problems.length} problem(s)`);
for (const p of problems.slice(0, 20)) console.log(`  PROBLEM ${p}`);
process.exit(args.includes("--check") && problems.length ? 1 : 0);
