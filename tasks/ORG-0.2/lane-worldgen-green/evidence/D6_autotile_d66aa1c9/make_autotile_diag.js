// Disposable DIAGNOSTIC copy (D6): classify the worldgen.autotile_shapes mismatches of the start area by what the
// painter knew that the test's tile-kind reconstruction does not: a solid rock face beside a non-solid cell of the same
// final kind (the painter joins solid faces only to solid neighbours), a template-painted or diff-overwritten cell, a wet
// neighbour, or unexplained. Writes lines only; the assertion is untouched. Usage: node make_autotile_diag.js <src> <dst>
"use strict";
const fs = require("fs");
const path = require("path");
const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: node make_autotile_diag.js <src game dir> <dst game dir>"); process.exit(1); }
if (fs.existsSync(dst)) { console.error(`refusing: ${dst} exists`); process.exit(1); }
fs.cpSync(src, dst, { recursive: true, filter: p => !/[\\/]test_output([\\/]|$)/.test(p) && !/game_runtime\.log$/.test(p) });
const file = path.join(dst, "js", "plugins", "DEUS_WorldGen.js");
let text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const anchor = `                    if (want !== got) { shapeErrors++; if (!firstErr) firstErr = \`(\${x},\${y}) \${wet ? "water" : "ground"} shape \${got}, expected \${want}\`; }` + eol;
if (text.split(anchor).length !== 2) { console.error("anchor not found exactly once"); process.exit(1); }
const inject = [
    "                    if (want !== got && window.UF.Test && UF.Test.write) { // AUTOTILE DIAG (disposable copy only)",
    "                        if (!window.__atHist) { window.__atHist = {}; window.__atSamples = []; }",
    "                        const Wd = window.UF.World, key0 = Wd.levelKey(a.x, a.y, 0), diffs = (st.diffs && st.diffs[key0]) || null;",
    "                        const g = WorldGen.groundTilesAt(a.x, a.y, x, y);",
    "                        const neigh = NB.map(([dx, dy]) => { const nx = x + dx, ny = y + dy; const ng = WorldGen.groundTilesAt(a.x, a.y, nx, ny); return { nx, ny, solid: ng ? ng.solid : null, kind: kindOf(here.data[ny * size + nx]) }; });",
    "                        const sameKindMixedSolid = g && neigh.some(nb => nb.kind === kind && nb.solid !== g.solid);",
    "                        const painterAgrees = g && g.layer0 === here.data[y * size + x];",
    "                        const tpl = typeof Wd.templatePaints === 'function' ? !!Wd.templatePaints(x, y) : null;",
    "                        const dif = diffs && diffs[y * size + x] !== undefined;",
    "                        const cls = !painterAgrees ? (dif ? 'overwritten by a saved diff' : (tpl ? 'overwritten by the start template' : 'final tile differs from the painter (unexplained)')) : (g.solid ? (sameKindMixedSolid ? 'solid face beside a non-solid cell of the same kind (painter joins solid only to solid)' : 'solid face, other') : (sameKindMixedSolid ? 'non-solid cell beside a solid face of the same kind' : (g.carved ? 'carved cell' : (g.ramp ? 'ramp cell' : 'non-solid, painter agrees, unexplained'))));",
    "                        window.__atHist[cls] = (window.__atHist[cls] || 0) + 1;",
    "                        if (window.__atSamples.length < 4) window.__atSamples.push(`(${x},${y}) kind ${kind} got ${got} want ${want} solid ${g ? g.solid : '?'} carved ${g ? g.carved : '?'} ramp ${g ? g.ramp : '?'} layer0 ${g ? g.layer0 : '?'} tile ${here.data[y * size + x]} tpl ${tpl} diff ${dif} neighbours ${neigh.map(nb => `${nb.kind}${nb.solid ? 'S' : nb.solid === false ? 'f' : '?'}`).join(',')}`);",
    "                    }"
].join(eol) + eol;
text = text.replace(anchor, () => anchor + inject);
const anchor2 = `            t.check("autotile_shapes", sampled > 100 && shapeErrors === 0,`;
if (text.split(anchor2).length !== 2) { console.error("anchor2 not found exactly once"); process.exit(1); }
text = text.replace(anchor2, () => `            if (window.UF.Test && UF.Test.write && window.__atHist) { UF.Test.write(\`DIAG6 autotile mismatches by class: \${Object.entries(window.__atHist).sort((p, q) => q[1] - p[1]).map(([k, v]) => \`[\${v}] \${k}\`).join(" || ")}\`); UF.Test.write(\`DIAG6 samples: \${window.__atSamples.join(" ; ")}\`); }` + eol + anchor2);
fs.writeFileSync(file, text);
console.log(`autotile diag written: ${file}`);
