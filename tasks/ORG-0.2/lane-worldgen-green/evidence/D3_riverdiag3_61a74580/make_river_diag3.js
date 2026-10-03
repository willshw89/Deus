// Disposable DIAGNOSTIC copy (D3): for every dry carved river cell of the z=0 map, is the river painted on the level of
// that cell's volumetric surface (z = Levels.surfaceElevationAt)? Writes histograms of the tile wetness at z = surface
// (and at z = 1 and z = 2 for reference) through World.buildArea(ax, ay, z). No assertion is changed.
// Usage: node make_river_diag3.js <src game dir> <dst game dir>
"use strict";
const fs = require("fs");
const path = require("path");
const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: node make_river_diag3.js <src game dir> <dst game dir>"); process.exit(1); }
if (fs.existsSync(dst)) { console.error(`refusing: ${dst} exists`); process.exit(1); }
fs.cpSync(src, dst, { recursive: true, filter: p => !/[\\/]test_output([\\/]|$)/.test(p) && !/game_runtime\.log$/.test(p) });
const file = path.join(dst, "js", "plugins", "DEUS_WorldGen.js");
let text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const anchor = "                    const dry = mine.filter(i => !wet(i));" + eol;
if (text.split(anchor).length !== 2) { console.error("anchor not found exactly once"); process.exit(1); }
const inject = [
    "                    if (window.UF.Test && UF.Test.write) { // RIVER DIAG 3 (disposable copy only; writes lines, asserts nothing)",
    "                        const L = window.UF.Levels, Wd = window.UF.World;",
    "                        const levelMaps = {}; const mapAt = z => { if (!(z in levelMaps)) { try { levelMaps[z] = Wd.buildArea(a.x, a.y, z); } catch (e) { levelMaps[z] = { error: String(e && e.message) }; } } return levelMaps[z]; };",
    "                        const wetAt = (z, i) => { const m = mapAt(z); return m && m.data ? isWaterTile(m.data[i]) : `err:${m && m.error}`; };",
    "                        const tileAt = (z, i) => { const m = mapAt(z); return m && m.data ? m.data[i] : -1; };",
    "                        const hist = {}, samples = [];",
    "                        for (const i of dry) {",
    "                            const x = i % size, y = Math.floor(i / size), gx = a.x * size + x, gy = a.y * size + y;",
    "                            const S = L && typeof L.surfaceElevationAt === \"function\" ? L.surfaceElevationAt(gx, gy, st.seed) : null;",
    "                            const k = `surface ${S}: wet at z=S ${S === null ? \"n/a\" : wetAt(S, i)}; wet z1 ${wetAt(1, i)}; wet z2 ${wetAt(2, i)}`;",
    "                            hist[k] = (hist[k] || 0) + 1;",
    "                            if (samples.length < 6) samples.push(`(${x},${y}) S=${S} tiles z0/z1/z2 ${tileAt(0, i)}/${tileAt(1, i)}/${tileAt(2, i)}`);",
    "                        }",
    "                        const m1 = mapAt(1), m2 = mapAt(2);",
    "                        const count = m => m && m.data ? (() => { let n = 0; for (let i = 0; i < size * size; i++) if (isWaterTile(m.data[i])) n++; return n; })() : `err:${m && m.error}`;",
    "                        UF.Test.write(`DIAG3 river ${r.anchorX} (id ${r.id}): ${dry.length} dry z0 cells by surface level and upper-level wetness: ${Object.entries(hist).sort((p, q) => q[1] - p[1]).map(([k, v]) => `[${v}] ${k}`).join(\" || \")}`);",
    "                        UF.Test.write(`DIAG3 river ${r.anchorX} (id ${r.id}): samples ${samples.join(\"; \")}`);",
    "                        UF.Test.write(`DIAG3 level maps: z1 ${m1 && m1.data ? `${m1.width}x${m1.height}, A1 water tiles ${count(m1)}` : `err:${m1 && m1.error}`}; z2 ${m2 && m2.data ? `${m2.width}x${m2.height}, A1 water tiles ${count(m2)}` : `err:${m2 && m2.error}`}; z0 A1 water tiles ${count(here)}`);",
    "                    }"
].join(eol) + eol;
text = text.replace(anchor, () => anchor + inject);
fs.writeFileSync(file, text);
console.log(`river diag 3 written: ${file}`);
