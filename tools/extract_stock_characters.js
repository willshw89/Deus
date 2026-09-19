// Cuts single characters out of the stock RPG Maker MZ character sheets into "$" sheets the engine can use.
//
// Why: every unit image is read as { characterName: <catalog string>, characterIndex: 0 } (UF_Wildlife,
// UF_History, UF_Colonists), so a stock 8-character sheet (People1..4, Actor1..3, Nature, Monster, Evil,
// Vehicle, SF_*) is only usable once each character is its own single-character sheet (VISION V9: placeholders
// are stock RPG Maker art, 2026-09-19).
//
// Two kinds of cut:
//   <Sheet>_<i>        character i (0-7) of an 8-character sheet. The sheet is 4 columns x 2 rows of 144x192 blocks;
//                      character i is the block at column i % 4, row floor(i / 4); each block is 3 frames x 4 facings
//                      of 48x48. Output: game/img/characters/$UF_Stock_<Sheet>_<i>.png (144x192, the block unchanged).
//   BigMonster<n>_r<r> row r (0-3) of $BigMonster1 / $BigMonster2. Those sheets are NOT one character with 4 facings:
//                      every row is a different south-facing monster (3 animation frames each; $BigMonster1 has
//                      96x96 frames, $BigMonster2 120x120). The output repeats row r in all 4 facing rows, so the
//                      monster faces the viewer whichever way it walks. Output: $UF_Stock_BigMonster<n>_r<r>.png
//                      (the source size, 288x384 or 360x480; the engine draws "$" sheets as width/3 x height/4).
//
// Aliases (--alias Name=<id>): writes a cut under a name the plugins hard-code (2026-09-19: UF_Colonists draws grown
// colonists without tier sheets as "$Adam" / "$Eve"), so a U7 stand-in with that name can be swapped for stock art
// without a code change. The file it replaces is kept once as <Name>.u7bak.png beside it (never overwritten), and a
// stock sheet's name or a $UF_Stock_ name is refused. The current aliases (keep them equal to start.pair tier 0):
//   node tools/extract_stock_characters.js --alias "$Adam=People1_4,$Eve=People1_5"
//
// Source: the pristine stock file, so an edited copy in game/ is never cut by mistake. In this order:
//   --source <dir>  a folder holding the stock sheets;
//   the RPG Maker MZ install's newdata/img/characters (env RMMZ_DIR, else the Steam default path);
//   game/img/characters (only when no install is found; the source line says so).
// When the game/ copy differs from the install copy the tool says so and cuts the install copy.
//
// Usage: node tools/extract_stock_characters.js [--only Nature_0,People1_4,BigMonster1_r1,...] [--alias Name=<id>,...]
//                                               [--list] [--check] [--source <dir>] [--game <game folder>]
//   (no --only)  cut every $UF_Stock_<id> named anywhere in <game>/data/UF_WorldCatalog.json
//   --only       cut just these (<id>, with or without the "$UF_Stock_" prefix)
//   --alias      also (or, with --only "", only) write these legacy names; see above
//   --list       print the stock sheets (and where each is read from), the $UF_Stock_ files that exist, and which
//                ones the catalog names; writes nothing
//   --check      verify the wanted outputs (and aliases) exist and match their source; writes nothing
// Idempotent: an output whose pixels already equal its source is left alone ("unchanged").
// Every output is decoded again after writing and must have the expected size and RGBA bytes identical to the source.
// Exit code: 0 ok, 1 a verification failed or an output is missing (--check), 2 bad arguments or a missing source.
"use strict";
const fs = require("fs");
const path = require("path");
const { readPNG } = require("./png_read");
const { writePNG } = require("./png_util");

const BLOCK_W = 144, BLOCK_H = 192;
const PREFIX = "$UF_Stock_";
const BAK = ".u7bak.png";
// The stock 8-character sheets.
const SHEETS = ["Actor1", "Actor2", "Actor3", "Evil", "Monster", "Nature", "People1", "People2", "People3", "People4", "Vehicle",
    "SF_Actor1", "SF_Actor2", "SF_Actor3", "SF_Monster", "SF_People1", "SF_People2", "SF_People3", "SF_Vehicle",
    "Damage1", "Damage2", "Damage3", "SF_Damage1", "SF_Damage2"];
// The stock one-character sheets whose rows are separate monsters (cut by row).
const ROW_SHEETS = ["$BigMonster1", "$BigMonster2"];

const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const root = path.resolve(__dirname, "..");
const gameDir = path.resolve(opt("--game", path.join(root, "game")));
const charDir = path.join(gameDir, "img", "characters");
const catalogFile = path.join(gameDir, "data", "UF_WorldCatalog.json");
const rmmzDir = process.env.RMMZ_DIR || "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ";
const installDir = path.join(rmmzDir, "newdata", "img", "characters");
const sourceOpt = opt("--source", null);

function fail(msg, code) {
    console.error(`extract_stock_characters: ${msg}`);
    process.exit(code);
}

/** Where a stock sheet is read from: { file, from, note }, or null. */
function sourceOf(sheet) {
    const gameFile = path.join(charDir, `${sheet}.png`);
    if (sourceOpt) {
        const f = path.join(path.resolve(sourceOpt), `${sheet}.png`);
        return fs.existsSync(f) ? { file: f, from: "--source", note: "" } : null;
    }
    const inst = path.join(installDir, `${sheet}.png`);
    if (fs.existsSync(inst)) {
        let note = "";
        if (fs.existsSync(gameFile) && !fs.readFileSync(gameFile).equals(fs.readFileSync(inst))) {
            note = `game/img/characters/${sheet}.png differs from the stock copy; cutting from the stock copy`;
        }
        return { file: inst, from: "RMMZ install", note };
    }
    if (fs.existsSync(gameFile)) return { file: gameFile, from: "game/img/characters (no RMMZ install found: not checked against stock)", note: "" };
    return null;
}

/** "Nature_0", "$UF_Stock_Nature_0", "SF_People1_3", "BigMonster1_r1" -> { sheet, index | row, out } or null. */
function parseId(s) {
    const bare = String(s).trim().replace(/^\$UF_Stock_/, "").replace(/\.png$/i, "");
    let m = /^(BigMonster[12])_r([0-3])$/.exec(bare);
    if (m) return { sheet: `$${m[1]}`, row: +m[2], out: `${PREFIX}${m[1]}_r${m[2]}` };
    m = /^(.+)_([0-7])$/.exec(bare);
    if (!m || !SHEETS.includes(m[1])) return null;
    return { sheet: m[1], index: +m[2], out: `${PREFIX}${m[1]}_${m[2]}` };
}

/** Every $UF_Stock_<id> string in the catalog. */
function catalogIds() {
    if (!fs.existsSync(catalogFile)) return [];
    const text = fs.readFileSync(catalogFile, "utf8");
    const found = new Set();
    for (const m of text.matchAll(/"\$UF_Stock_([A-Za-z0-9_]+?_(?:[0-7]|r[0-3]))"/g)) found.add(m[1]);
    return Array.from(found).sort();
}

const sheetCache = new Map();
function loadSheet(sheet) {
    if (sheetCache.has(sheet)) return sheetCache.get(sheet);
    const src = sourceOf(sheet);
    if (!src) fail(`no source for ${sheet}.png (looked in ${sourceOpt || installDir} and ${charDir})`, 2);
    const img = readPNG(src.file);
    if (ROW_SHEETS.includes(sheet)) {
        if (img.width % 3 || img.height % 4) fail(`${src.file} is ${img.width}x${img.height}, not 3 x 4 frames`, 2);
    } else if (img.width !== BLOCK_W * 4 || img.height !== BLOCK_H * 2) {
        fail(`${src.file} is ${img.width}x${img.height}, not a 4x2 sheet of ${BLOCK_W}x${BLOCK_H} blocks`, 2);
    }
    const e = { src, img };
    sheetCache.set(sheet, e);
    return e;
}

/** The expected output of a job: { width, height, data }. */
function expected(job, img) {
    if (job.row !== undefined) {
        const rowH = img.height / 4, rowBytes = img.width * rowH * 4;
        const data = Buffer.alloc(rowBytes * 4);
        const from = job.row * rowBytes;
        for (let r = 0; r < 4; r++) img.data.copy(data, r * rowBytes, from, from + rowBytes);
        return { width: img.width, height: img.height, data };
    }
    const bx = (job.index % 4) * BLOCK_W, by = Math.floor(job.index / 4) * BLOCK_H;
    const data = Buffer.alloc(BLOCK_W * BLOCK_H * 4);
    for (let y = 0; y < BLOCK_H; y++) {
        const from = ((by + y) * img.width + bx) * 4;
        img.data.copy(data, y * BLOCK_W * 4, from, from + BLOCK_W * 4);
    }
    return { width: BLOCK_W, height: BLOCK_H, data };
}

/** Decode `file` and compare it to `want`: null when identical, else the reason. */
function mismatch(file, want) {
    if (!fs.existsSync(file)) return "missing";
    let got;
    try { got = readPNG(file); } catch (e) { return `does not decode: ${e.message}`; }
    if (got.width !== want.width || got.height !== want.height) return `${got.width}x${got.height}, want ${want.width}x${want.height}`;
    if (!got.data.equals(want.data)) {
        let n = 0;
        for (let i = 0; i < want.data.length; i += 4) if (got.data.compare(want.data, i, i + 4, i, i + 4) !== 0) n++;
        return `${n} of ${want.width * want.height} pixels differ from the source`;
    }
    return null;
}

/** "--alias $Adam=People1_4,$Eve=People1_5" -> [{ name, job }]. */
function parseAliases(text) {
    if (!text) return [];
    const stockNames = new Set([...SHEETS, ...ROW_SHEETS]);
    if (fs.existsSync(installDir)) for (const f of fs.readdirSync(installDir)) if (f.endsWith(".png")) stockNames.add(f.slice(0, -4));
    return text.split(",").filter(Boolean).map(pair => {
        const k = pair.indexOf("=");
        const name = k > 0 ? pair.slice(0, k).trim() : "";
        const job = k > 0 ? parseId(pair.slice(k + 1)) : null;
        if (!name || !job) fail(`--alias "${pair}" is not <Name>=<id>`, 2);
        if (!/^[$!]*[A-Za-z0-9_]+$/.test(name)) fail(`--alias name "${name}" is not a plain sheet name`, 2);
        if (stockNames.has(name)) fail(`--alias "${name}" is a stock RPG Maker sheet; never overwritten`, 2);
        if (name.startsWith(PREFIX)) fail(`--alias "${name}" is a ${PREFIX} name; cut it with --only instead`, 2);
        return { name, job };
    });
}

function list() {
    console.log(`Stock sheets (source order: ${sourceOpt ? "--source" : `RMMZ install ${installDir}`}, then game/img/characters):`);
    for (const sheet of [...SHEETS, ...ROW_SHEETS]) {
        const src = sourceOf(sheet);
        console.log(`  ${sheet.padEnd(12)} ${src ? src.from : "NOT FOUND"}${src && src.note ? `  (${src.note})` : ""}`);
    }
    const existing = fs.readdirSync(charDir).filter(f => f.startsWith(PREFIX) && f.endsWith(".png")).map(f => f.slice(PREFIX.length, -4)).sort();
    const named = new Set(catalogIds());
    console.log(`\n${existing.length} ${PREFIX}*.png in ${charDir}:`);
    for (const id of existing) console.log(`  ${PREFIX}${id}${named.has(id) ? "  (named in the catalog)" : ""}`);
    const missing = Array.from(named).filter(id => !existing.includes(id));
    console.log(`\nNamed in the catalog but not on disk: ${missing.length ? missing.join(", ") : "none"}`);
    const baks = fs.readdirSync(charDir).filter(f => f.endsWith(BAK)).sort();
    console.log(`Kept originals of aliased sheets (*${BAK}): ${baks.length ? baks.join(", ") : "none"}`);
}

function main() {
    if (args.includes("--list")) return list();
    const only = opt("--only", null);
    const checkOnly = args.includes("--check");
    const aliases = parseAliases(opt("--alias", null));
    const wanted = only !== null ? only.split(",").filter(Boolean) : catalogIds();
    if (!wanted.length && !aliases.length) fail(only !== null ? "--only lists nothing" : "the catalog names no $UF_Stock_ sheet; pass --only", 2);
    const jobs = wanted.map(s => {
        const j = parseId(s);
        if (!j) fail(`"${s}" is not <Sheet>_<0-7> of a stock 8-character sheet (${SHEETS.join(", ")}) or BigMonster<1|2>_r<0-3>`, 2);
        return Object.assign({ file: path.join(charDir, `${j.out}.png`), label: `${j.out}.png` }, j);
    });
    for (const a of aliases) jobs.push(Object.assign({}, a.job, { file: path.join(charDir, `${a.name}.png`), label: `${a.name}.png (alias of ${a.job.out})`, alias: a.name }));
    let failed = 0, written = 0, unchanged = 0;
    const notes = new Set();
    for (const j of jobs) {
        const { src, img } = loadSheet(j.sheet);
        if (src.note) notes.add(src.note);
        const want = expected(j, img);
        const before = mismatch(j.file, want);
        if (!before) {
            unchanged++;
            console.log(`unchanged ${j.label}`);
            continue;
        }
        if (checkOnly) {
            failed++;
            console.log(`FAIL ${j.label}: ${before}`);
            continue;
        }
        if (j.alias && fs.existsSync(j.file)) {
            const bak = path.join(charDir, `${j.alias}${BAK}`);
            if (!fs.existsSync(bak)) {
                fs.copyFileSync(j.file, bak);
                if (!fs.readFileSync(bak).equals(fs.readFileSync(j.file))) { failed++; console.log(`FAIL ${j.label}: backup ${j.alias}${BAK} differs from the original; not overwritten`); continue; }
                console.log(`kept the original as ${j.alias}${BAK}`);
            } else console.log(`${j.alias}${BAK} already kept (left as it is)`);
        }
        writePNG(j.file, want.width, want.height, want.data);
        const after = mismatch(j.file, want);
        const what = j.row !== undefined ? `${j.sheet} row ${j.row} in all 4 facings` : `${j.sheet} character ${j.index}`;
        if (after) {
            failed++;
            console.log(`FAIL ${j.label} after writing: ${after}`);
        } else {
            written++;
            console.log(`wrote ${j.label}  (${what}, from ${src.from}; decoded again: ${want.width}x${want.height}, pixels identical)`);
        }
    }
    for (const n of notes) console.log(`note: ${n}`);
    console.log(`RESULT ${failed ? "FAIL" : "PASS"}: ${jobs.length} wanted, ${written} written, ${unchanged} unchanged, ${failed} failed`);
    process.exit(failed ? 1 : 0);
}

main();
