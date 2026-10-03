// Disposable DIAGNOSTIC copy (D5): after the river checks the worldgen suite (copy only) scrolls the view to river cells
// and takes captures (in-game proof of the channel), then scans for flat ground (S = 0, floor) around the Pela Tribe camp
// and writes the distances (lead for the kit site defect). No assertion is changed; writes lines and PNGs only.
// Usage: node make_river_capture.js <src game dir> <dst game dir>
"use strict";
const fs = require("fs");
const path = require("path");
const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: node make_river_capture.js <src game dir> <dst game dir>"); process.exit(1); }
if (fs.existsSync(dst)) { console.error(`refusing: ${dst} exists`); process.exit(1); }
fs.cpSync(src, dst, { recursive: true, filter: p => !/[\\/]test_output([\\/]|$)/.test(p) && !/game_runtime\.log$/.test(p) });
const file = path.join(dst, "js", "plugins", "DEUS_WorldGen.js");
let text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const anchor = "            if (W.inWorld(a.x, a.y + 1)) {" + eol + "                // Across an area edge: the bottom row of this area and the top row of the one below share water columns.";
if (text.split(anchor).length !== 2) { console.error("anchor not found exactly once"); process.exit(1); }
const inject = [
    "            if (window.UF.Test && UF.Test.write) { // RIVER CAPTURE + PELA SCAN (disposable copy only)",
    "                const Cam = window.UF.Camera;",
    "                const spots = [[183, 62, 'river_235_channel_183_62'], [205, 95, 'river_235_lower_205_95'], [28, 182, 'river_28_source_28_182'], [60, 210, 'river_28_lower_60_210']];",
    "                for (const [cx, cy, name] of spots) {",
    "                    $gamePlayer.locate(cx, cy); $gameMap.scrollTo ? null : null;",
    "                    await t.waitFrames(30);",
    "                    t.screenshot(name);",
    "                    UF.Test.write(`CAPTURE ${name}: player at (${$gamePlayer.x},${$gamePlayer.y}), display (${$gameMap.displayX().toFixed(1)},${$gameMap.displayY().toFixed(1)}), zoom ${Cam && typeof Cam.level === 'function' ? Cam.level() : 'n/a'}`);",
    "                }",
    "                $gamePlayer.locate(mid, mid); await t.waitFrames(10);",
    "                const L = window.UF.Levels, H = window.UF.History;",
    "                const pela = st.factions && st.factions.list ? st.factions.list.find(f => /Pela/.test(f.name || '')) : null;",
    "                if (pela && L && typeof L.surfaceElevationAt === 'function') {",
    "                    const camp = H && typeof H.campCell === 'function' ? H.campCell(st, pela) : null;",
    "                    const hx = pela.home.x, hy = pela.home.y;",
    "                    const flat = (x, y) => L.surfaceElevationAt(a.x * size + x, a.y * size + y, st.seed) === 0 && L.shapeCodeAt(a.x, a.y, x, y, 0) === 2 && !isWaterTile(here.data[y * size + x]);",
    "                    const blockOk = (x, y) => { if (x < 1 || y < 1 || x > size - 2 || y > size - 2) return false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!flat(x + dx, y + dy)) return false; return true; };",
    "                    let best = null, bestD = Infinity, flat20 = 0, flat30 = 0;",
    "                    for (let y = Math.max(1, hy - 80); y <= Math.min(size - 2, hy + 80); y++) for (let x = Math.max(1, hx - 80); x <= Math.min(size - 2, hx + 80); x++) {",
    "                        const d = Math.hypot(x - hx, y - hy);",
    "                        if (d <= 20 && flat(x, y)) flat20++;",
    "                        if (d <= 30 && flat(x, y)) flat30++;",
    "                        if (d < bestD && blockOk(x, y)) { best = { x, y }; bestD = d; }",
    "                    }",
    "                    const Sh = L.surfaceElevationAt(a.x * size + hx, a.y * size + hy, st.seed), shH = L.shapeCodeAt(a.x, a.y, hx, hy, 0);",
    "                    UF.Test.write(`PELA home (${hx},${hy}) surface ${Sh} shape ${shH}; History camp ${camp ? `(${camp.x},${camp.y}) moved ${camp.moved}` : 'null'}; flat floor cells within 20: ${flat20}, within 30: ${flat30}; nearest all-flat 3x3 block ${best ? `(${best.x},${best.y}) at ${bestD.toFixed(1)} cells` : 'none within 80'}`);",
    "                    const hist = {}; for (let dy = -20; dy <= 20; dy++) for (let dx = -20; dx <= 20; dx++) { const x = hx + dx, y = hy + dy; if (x < 0 || y < 0 || x >= size || y >= size || Math.hypot(dx, dy) > 20) continue; const k = `S${L.surfaceElevationAt(a.x * size + x, a.y * size + y, st.seed)}/shape${L.shapeCodeAt(a.x, a.y, x, y, 0)}`; hist[k] = (hist[k] || 0) + 1; }",
    "                    UF.Test.write(`PELA cells within 20 by surface/shape: ${Object.entries(hist).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k}: ${v}`).join(', ')}`);",
    "                }",
    "            }",
    ""
].join(eol);
text = text.replace(anchor, () => inject + anchor);
fs.writeFileSync(file, text);
console.log(`river capture/pela scan written: ${file}`);
