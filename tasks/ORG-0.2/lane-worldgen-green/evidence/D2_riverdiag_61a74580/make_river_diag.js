// Builds a disposable DIAGNOSTIC copy of a validated controlled snapshot: the worldgen suite's river_continuous block
// additionally writes (UF.Test.write, no new check, no assertion change) a trace of each river's dry carved cells:
//   per cell class: Levels surface elevation, z0 shape code, climate water kind, groundTilesAt (solid/carved/ramp/layer0),
//   template coverage, saved tile diff, pristine-build wetness; plus the full trace of the first dry cell and of (183,62).
// Diagnosis only (TRIAGE_W2 list). Usage: node make_river_diag.js <src game dir> <dst game dir>
"use strict";
const fs = require("fs");
const path = require("path");
const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: node make_river_diag.js <src game dir> <dst game dir>"); process.exit(1); }
if (fs.existsSync(dst)) { console.error(`refusing: ${dst} exists`); process.exit(1); }
fs.cpSync(src, dst, { recursive: true, filter: p => !/[\\/]test_output([\\/]|$)/.test(p) && !/game_runtime\.log$/.test(p) });
const file = path.join(dst, "js", "plugins", "DEUS_WorldGen.js");
let text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const anchor = "                    const dry = mine.filter(i => !wet(i));" + eol;
if (text.split(anchor).length !== 2) { console.error("anchor not found exactly once"); process.exit(1); }
const inject = [
    "                    if (window.UF.Test && UF.Test.write) { // RIVER DIAG (disposable copy only; writes lines, asserts nothing)",
    "                        const L = window.UF.Levels, Wd = window.UF.World, key0 = Wd.levelKey(a.x, a.y, 0);",
    "                        const diffs = (st.diffs && st.diffs[key0]) || null;",
    "                        const pristine = (() => { try { return pristineBuild(a.x, a.y); } catch (e) { return null; } })();",
    "                        const fn = (o, k) => o && typeof o[k] === \"function\";",
    "                        const trace = i => {",
    "                            const x = i % size, y = Math.floor(i / size), gx = a.x * size + x, gy = a.y * size + y;",
    "                            let c = null; try { c = WorldGen.cellInfo(gx, gy); } catch (e) {}",
    "                            let g = null; try { g = WorldGen.groundTilesAt(a.x, a.y, x, y); } catch (e) {}",
    "                            const S = fn(L, \"surfaceElevationAt\") ? L.surfaceElevationAt(gx, gy, st.seed) : \"n/a\";",
    "                            const sc = fn(L, \"shapeCodeAt\") ? L.shapeCodeAt(a.x, a.y, x, y, 0) : \"n/a\";",
    "                            const tpl = fn(Wd, \"templatePaints\") ? !!Wd.templatePaints(x, y) : \"n/a\";",
    "                            const dif = diffs ? (diffs[i] !== undefined ? diffs[i] : (diffs[`${x},${y}`] !== undefined ? diffs[`${x},${y}`] : \"none\")) : \"none\";",
    "                            return { x, y, river: chunk.river[i], bed: chunk.bed ? Number(chunk.bed[i]).toFixed(3) : \"n/a\", climate: c ? (c.water || (c.lake ? \"lake\" : \"land\")) + (c.peak ? \"+peak\" : \"\") + (c.walkable ? \"\" : \"+unwalkable\") : \"?\",",
    "                                surface: S, shape: sc, gSolid: g ? g.solid : \"?\", gCarved: g ? g.carved : \"?\", gRamp: g ? g.ramp : \"?\", gLayer0: g ? g.layer0 : \"?\",",
    "                                tile: here.data[i], tileA1: isWaterTile(here.data[i]), pristineTile: pristine ? pristine.data[i] : \"?\", pristineA1: pristine ? isWaterTile(pristine.data[i]) : \"?\", template: tpl, diff: dif };",
    "                        };",
    "                        const cls = t => `surface ${t.surface} / shape ${t.shape} / solid ${t.gSolid} carved ${t.gCarved} ramp ${t.gRamp} / climate ${t.climate} / tpl ${t.template} / diff ${t.diff === \"none\" ? \"none\" : \"yes\"} / pristineA1 ${t.pristineA1}`;",
    "                        const hist = {}; for (const i of dry) { const k = cls(trace(i)); hist[k] = (hist[k] || 0) + 1; }",
    "                        const wetHist = {}; for (const i of mine) if (wet(i)) { const k = cls(trace(i)); wetHist[k] = (wetHist[k] || 0) + 1; }",
    "                        UF.Test.write(`DIAG river ${r.anchorX} (id ${r.id}): ${dry.length} dry of ${mine.length} carved; dry by class: ${Object.entries(hist).sort((p, q) => q[1] - p[1]).map(([k, v]) => `[${v}] ${k}`).join(\" || \")}`);",
    "                        UF.Test.write(`DIAG river ${r.anchorX} (id ${r.id}): wet by class: ${Object.entries(wetHist).sort((p, q) => q[1] - p[1]).map(([k, v]) => `[${v}] ${k}`).join(\" || \")}`);",
    "                        if (dry.length) UF.Test.write(`DIAG river ${r.anchorX} (id ${r.id}): first dry cell ${JSON.stringify(trace(dry[0]))}`);",
    "                        const i183 = 62 * size + 183; if (chunk.river[i183] === r.id + 1) UF.Test.write(`DIAG river ${r.anchorX} (id ${r.id}): cell (183,62) ${JSON.stringify(trace(i183))}`);",
    "                        UF.Test.write(`DIAG volumeStats ${JSON.stringify(WorldGen.volumeStats[`${a.x},${a.y}`] || null)}`);",
    "                    }"
].join(eol) + eol;
text = text.replace(anchor, () => anchor + inject);
fs.writeFileSync(file, text);
console.log(`river diag written: ${file}`);
