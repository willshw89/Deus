// Cuts single icons out of the stock RPG Maker MZ IconSet into "!$" item sheets the engine draws on the ground.
//
// Why: item types are drawn by UF_Items from items.types[].image, a "!$" character sheet: the frame is column 1,
// row 0 of a 3x4 sheet (frame size from the sidecar json, else width/3 x height/4), anchored by the sidecar's
// "anchor" (else bottom-centre) at the bottom-centre of the item's cell. UF_Sheet's inventory icons use the same
// frame. Stock icons are the item placeholders (VISION V9, 2026-09-19: "stock is fine").
//
// Output for icon n:
//   game/img/characters/!$UF_Icon_<n>.png   144x192 = 3 columns x 4 rows of 48x48 frames; the 32x32 icon is copied
//                                           unscaled into every frame at (8, 8), so it sits centred in its cell
//   game/img/characters/!$UF_Icon_<n>.json  sidecar: frameWidth/Height 48, anchor [24, 47], layer "item", source
// Icon n is the 32x32 square at column n % 16, row floor(n / 16) of IconSet.png (the editor's icon index).
//
// Source: the pristine stock file, so an edited copy in game/ is never cut by mistake. In this order:
//   --source <file>  an IconSet.png;
//   the RPG Maker MZ install's newdata/img/system/IconSet.png (env RMMZ_DIR, else the Steam default path);
//   game/img/system/IconSet.png (only when no install is found; a warning is printed).
//
// Usage: "C:\Program Files\nodejs\node.exe" tools\extract_stock_icons.js [--only 96,300,...] [--check] [--list] [--source <png>] [--game <game folder>]
//   (no --only)  make every !$UF_Icon_<n> named anywhere in game/data/UF_WorldCatalog.json
//   --only       make just these icon numbers
//   --check      verify the wanted outputs exist and match their icon; writes nothing
//   --list       print the source, the !$UF_Icon_ files that exist and which ones the catalog names; writes nothing
// Idempotent: an output whose pixels and sidecar already match is left alone ("unchanged").
// Every output is decoded again after writing and must be 144x192 with each frame equal to the icon at (8, 8)
// and transparent elsewhere. An icon that is fully transparent in the IconSet is refused (exit 2).
// Exit code: 0 ok, 1 a verification failed or an output is missing (--check), 2 bad arguments or a missing source.
// Owner: Claude Code. Written 2026-09-19.
"use strict";
const fs = require("fs");
const path = require("path");
const { readPNG } = require("./png_read");
const { writePNG } = require("./png_util");

const ICON = 32, FRAME = 48, COLS = 3, ROWS = 4, OFF = (FRAME - ICON) / 2;
const SHEET_W = FRAME * COLS, SHEET_H = FRAME * ROWS;
const PREFIX = "!$UF_Icon_";

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
const installFile = path.join(rmmzDir, "newdata", "img", "system", "IconSet.png");
const gameFile = path.join(gameDir, "img", "system", "IconSet.png");

function fail(msg, code) {
    console.error(`extract_stock_icons: ${msg}`);
    process.exit(code);
}

/** Where IconSet.png is read from: { file, from, note }. */
function source() {
    const s = opt("--source", null);
    if (s) {
        const f = path.resolve(s);
        if (!fs.existsSync(f)) fail(`--source ${f} does not exist`, 2);
        return { file: f, from: "--source", note: "" };
    }
    if (fs.existsSync(installFile)) {
        let note = "";
        if (fs.existsSync(gameFile) && !fs.readFileSync(gameFile).equals(fs.readFileSync(installFile))) {
            note = "game/img/system/IconSet.png differs from the stock copy; cutting from the stock copy";
        }
        return { file: installFile, from: "RMMZ install", note };
    }
    if (fs.existsSync(gameFile)) return { file: gameFile, from: "game/img/system (no RMMZ install found: not checked against stock)", note: "" };
    fail(`no IconSet.png (looked for ${installFile} and ${gameFile})`, 2);
}

/** Every !$UF_Icon_<n> string in the catalog, as numbers. */
function catalogIcons() {
    if (!fs.existsSync(catalogFile)) return [];
    const text = fs.readFileSync(catalogFile, "utf8");
    const found = new Set();
    for (const m of text.matchAll(/"!\$UF_Icon_(\d+)"/g)) found.add(+m[1]);
    return Array.from(found).sort((a, b) => a - b);
}

/** The RGBA bytes of icon n (32x32), or a reason string. */
function iconPixels(img, n) {
    const perRow = Math.floor(img.width / ICON), rows = Math.floor(img.height / ICON);
    if (!Number.isInteger(n) || n < 0 || n >= perRow * rows) return `icon ${n} is outside the ${perRow}x${rows} IconSet`;
    const sx = (n % perRow) * ICON, sy = Math.floor(n / perRow) * ICON;
    const out = Buffer.alloc(ICON * ICON * 4);
    let opaque = 0;
    for (let y = 0; y < ICON; y++) {
        const from = ((sy + y) * img.width + sx) * 4;
        img.data.copy(out, y * ICON * 4, from, from + ICON * 4);
    }
    for (let i = 3; i < out.length; i += 4) if (out[i] > 0) opaque++;
    if (!opaque) return `icon ${n} is empty (fully transparent) in the IconSet`;
    return out;
}

/** The 144x192 sheet: the icon at (8, 8) of every 48x48 frame, transparent elsewhere. */
function sheetPixels(icon) {
    const out = Buffer.alloc(SHEET_W * SHEET_H * 4);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        for (let y = 0; y < ICON; y++) {
            const to = ((r * FRAME + OFF + y) * SHEET_W + c * FRAME + OFF) * 4;
            icon.copy(out, to, y * ICON * 4, (y + 1) * ICON * 4);
        }
    }
    return out;
}

function sidecar(n) {
    return {
        id: `UF_Icon_${n}`,
        frameWidth: FRAME,
        frameHeight: FRAME,
        anchor: [FRAME / 2, FRAME - 1],
        footprint: [1, 1],
        facings: ["S"],
        animations: { stand: [1] },
        layer: "item",
        source: `stock RPG Maker MZ img/system/IconSet.png icon ${n} (32x32, unscaled, centred in each 48x48 frame); made by tools/extract_stock_icons.js`
    };
}
const sidecarText = n => JSON.stringify(sidecar(n), null, 2) + "\n";

/** null when the files on disk equal what icon n should give, else the reason. */
function mismatch(n, wantPng) {
    const png = path.join(charDir, `${PREFIX}${n}.png`), json = path.join(charDir, `${PREFIX}${n}.json`);
    if (!fs.existsSync(png)) return "png missing";
    let got;
    try { got = readPNG(png); } catch (e) { return `png does not decode: ${e.message}`; }
    if (got.width !== SHEET_W || got.height !== SHEET_H) return `${got.width}x${got.height}, want ${SHEET_W}x${SHEET_H}`;
    if (!got.data.equals(wantPng)) {
        let d = 0;
        for (let i = 0; i < wantPng.length; i += 4) if (got.data.compare(wantPng, i, i + 4, i, i + 4) !== 0) d++;
        return `${d} of ${SHEET_W * SHEET_H} pixels differ from icon ${n} placed in every frame`;
    }
    if (!fs.existsSync(json)) return "sidecar missing";
    if (fs.readFileSync(json, "utf8") !== sidecarText(n)) return "sidecar differs";
    return null;
}

function list(src) {
    console.log(`Source: ${src.file} (${src.from})${src.note ? `  (${src.note})` : ""}`);
    const existing = fs.readdirSync(charDir).filter(f => f.startsWith(PREFIX) && f.endsWith(".png")).map(f => +f.slice(PREFIX.length, -4)).sort((a, b) => a - b);
    const named = new Set(catalogIcons());
    console.log(`${existing.length} ${PREFIX}*.png in ${charDir}:`);
    for (const n of existing) console.log(`  ${PREFIX}${n}${named.has(n) ? "  (named in the catalog)" : ""}`);
    const missing = Array.from(named).filter(n => !existing.includes(n));
    console.log(`Named in the catalog but not on disk: ${missing.length ? missing.join(", ") : "none"}`);
}

function main() {
    const src = source();
    if (args.includes("--list")) return list(src);
    const only = opt("--only", null);
    const checkOnly = args.includes("--check");
    const wanted = only ? only.split(",").map(s => s.trim()).filter(Boolean).map(s => (/^\d+$/.test(s) ? +s : NaN)) : catalogIcons();
    if (wanted.some(n => Number.isNaN(n))) fail(`--only takes icon numbers, got "${only}"`, 2);
    if (!wanted.length) fail(only ? "--only lists nothing" : "the catalog names no !$UF_Icon_ sheet; pass --only", 2);
    const img = readPNG(src.file);
    let failed = 0, written = 0, unchanged = 0;
    for (const n of Array.from(new Set(wanted))) {
        const icon = iconPixels(img, n);
        if (typeof icon === "string") fail(icon, 2);
        const want = sheetPixels(icon);
        const before = mismatch(n, want);
        if (!before) {
            unchanged++;
            console.log(`unchanged ${PREFIX}${n}`);
            continue;
        }
        if (checkOnly) {
            failed++;
            console.log(`FAIL ${PREFIX}${n}: ${before}`);
            continue;
        }
        writePNG(path.join(charDir, `${PREFIX}${n}.png`), SHEET_W, SHEET_H, want);
        fs.writeFileSync(path.join(charDir, `${PREFIX}${n}.json`), sidecarText(n));
        const after = mismatch(n, want);
        if (after) {
            failed++;
            console.log(`FAIL ${PREFIX}${n} after writing: ${after}`);
        } else {
            written++;
            console.log(`wrote ${PREFIX}${n}.png + .json  (IconSet icon ${n}; decoded again: ${SHEET_W}x${SHEET_H}, every frame equals the icon)`);
        }
    }
    if (src.note) console.log(`note: ${src.note}`);
    console.log(`RESULT ${failed ? "FAIL" : "PASS"}: ${wanted.length} wanted, ${written} written, ${unchanged} unchanged, ${failed} failed (source: ${src.from})`);
    process.exit(failed ? 1 : 0);
}

main();
