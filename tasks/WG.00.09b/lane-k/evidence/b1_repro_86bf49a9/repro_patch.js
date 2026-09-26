// B1 reproduction (WG.00.09b Fix 1): scratch instrumentation for a temp clone of 86bf49a9. Never committed.
// 1. Adds per-frame TRACE lines to the depth suite's entities_drawn path of DEUS_Depth.js (the natural world, unchanged
//    otherwise): sheet ready, whether rebuildItems' own query finds the item, tracked, visible, display, window.
// 2. Writes DEUS_B1Repro.js: suite b1_repro puts one item stack on +1 near the north loop seam and one in the interior,
//    seen from +2, and traces the same facts per frame for 60 frames.
"use strict";
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "game", "js", "plugins", "DEUS_Depth.js");
let src = fs.readFileSync(file, "utf8");
const need = (s) => { if (!src.includes(s)) throw new Error("anchor not found: " + s.slice(0, 80)); };

const TRACE_FN = `
            const b1Img = itemTypeId && I && I.type ? I.type(itemTypeId).image : null;
            const b1Trace = async (label, n, item) => {
                for (let k = 0; k <= n; k++) {
                    const r = D.root(), pl = r ? r.planes[0] : null, win = r ? r._win : null;
                    const bmp = b1Img ? ImageManager.loadCharacter(b1Img) : null;
                    let found = "-";
                    if (pl && pl.level && win && item) {
                        const near = { x: win.dx + win.cols / 2, y: win.dy + win.rows / 2 }, radius = Math.hypot(win.cols / 2 + 3, win.rows / 2 + 3 + 6);
                        const hits = I.find({ area: { x: pl.level.x, y: pl.level.y, z: pl.level.z }, near, radius });
                        found = String(hits.some(h => h.item.id === item.id)) + " (near " + near.x + "," + near.y + " radius " + radius.toFixed(1) + ", " + hits.length + " hit(s))";
                    }
                    const s = pl && item ? pl._items.get(item.id) : null;
                    UF.Test.write("TRACE b1 " + label + " +" + k + " frame " + Graphics.frameCount + " world " + W._frame + ": item sheet " + b1Img + " ready " + (bmp ? bmp.isReady() : "-") + "; rebuildItems query finds it " + found + "; tracked " + !!s + "; visible " + (s ? s.visible : "-") + "; display (" + $gameMap.displayX() + "," + $gameMap.displayY() + ") window x " + (win && win.x0) + ".." + (win && win.x1) + " y " + (win && win.y0) + ".." + (win && win.y1) + "; item at (" + (item && item.x) + "," + (item && item.y) + "," + (item && item.z) + ")");
                    if (k < n) await t.waitFrames(1);
                }
            };
            UF.Test.write("TRACE b1 world seed " + W.state.seed + "; proof window (" + best.wx + "," + best.wy + ") centre (" + center.x + "," + center.y + "); item sheet " + b1Img + " ready before I.create: " + (b1Img ? ImageManager.loadCharacter(b1Img).isReady() : "-"));
`;
const A1 = `            const itemMade = fx[1] && itemTypeId ? I.create(itemTypeId, 3, { area: lv1, x: fx[1].x, y: fx[1].y }) : null;`;
need(A1);
src = src.replace(A1, TRACE_FN + A1);
const A2 = `            if (unitMade) fx[2] = { x: unitMade.x, y: unitMade.y }; // it may have snapped to the nearest free cell
            await t.waitFrames(6);`;
need(A2);
src = src.replace(A2, `            if (unitMade) fx[2] = { x: unitMade.x, y: unitMade.y }; // it may have snapped to the nearest free cell
            await b1Trace("after I.create", 6, itemMade);`);
const A3 = `            const ec = p1.entityCounts();`;
need(A3);
src = src.replace(A3, `            await b1Trace("at the check", 0, itemMade);\n` + A3);
const A4 = `            // 7. Crisp: every opaque pixel`;
need(A4);
src = src.replace(A4, `            if (ec.items < 1) await b1Trace("after a failed check", 60, itemMade);\n` + A4);
fs.writeFileSync(file, src);
console.log("patched " + file);

const REPRO = String.raw`// DEUS_B1Repro.js - scratch B1 reproduction suite (temp clone only, never committed).
(() => {
    "use strict";
    const _start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _start.call(this);
        if (!(window.UF && UF.Test && UF.Test.active)) return;
        UF.Test.suite("b1_repro", async t => {
            const W = UF.World, L = UF.Levels, D = UF.Depth, I = UF.Items, w = UF.Test.write;
            const area = W.viewLevel(), size = W.state.size;
            w("TRACE b1r world seed " + W.state.seed + ", size " + size + ", loop x " + $gameMap.isLoopHorizontal() + " y " + $gameMap.isLoopVertical() + ", scrollType " + $dataMap.scrollType);
            if (UF.Environment && UF.Environment.setWeather) UF.Environment.setWeather({ x: area.x, y: area.y }, "clear");
            if (UF.Time && UF.Time.setForTest) UF.Time.setForTest(12, 0);
            const itemTypeId = ["stone", "oak_log", "log", "wood", "berries", "rations"].find(id => I.type(id) && I.type(id).image);
            const img = I.type(itemTypeId).image;
            const order = (process.env.B1_ORDER || "interior,seam").split(",");
            const cx = size / 2;
            for (const kind of order) {
                const cy = kind === "seam" ? 6 : 128;
                const ic = { x: cx + 3, y: cy - 3 };
                L.setShape({ area, x: ic.x, y: ic.y, z: 1 }, "floor", { material: "stone" });
                L.setShape({ area, x: ic.x, y: ic.y, z: 2 }, "open");
                L.setView(2, { center: { x: cx, y: cy } });
                await t.waitUntil(() => !L.switching() && L.view() === 2 && SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted(), 30000, "the +2 view");
                await t.waitFrames(8);
                w("TRACE b1r " + kind + ": view centre (" + cx + "," + cy + "), display (" + $gameMap.displayX() + "," + $gameMap.displayY() + "); +1 shape at the item cell " + L.shapeAt({ area, x: ic.x, y: ic.y, z: 1 }) + "; sheet " + img + " ready before I.create " + ImageManager.loadCharacter(img).isReady());
                const it = I.create(itemTypeId, 3, { area: { x: area.x, y: area.y, z: 1 }, x: ic.x, y: ic.y });
                let firstVisible = -1, firstFound = -1, firstReady = -1;
                for (let k = 0; k <= 60; k++) {
                    const r = D.root(), pl = r ? r.planes[0] : null, win = r ? r._win : null;
                    const bmp = ImageManager.loadCharacter(img);
                    let found = false, hits = 0;
                    if (pl && pl.level && win && it) {
                        const near = { x: win.dx + win.cols / 2, y: win.dy + win.rows / 2 }, radius = Math.hypot(win.cols / 2 + 3, win.rows / 2 + 3 + 6);
                        const h = I.find({ area: { x: pl.level.x, y: pl.level.y, z: pl.level.z }, near, radius });
                        hits = h.length; found = h.some(q => q.item.id === it.id);
                    }
                    const s = pl && it ? pl._items.get(it.id) : null;
                    if (bmp.isReady() && firstReady < 0) firstReady = k;
                    if (found && firstFound < 0) firstFound = k;
                    if (s && s.visible && firstVisible < 0) firstVisible = k;
                    if (k <= 8 || k % 10 === 0) w("TRACE b1r " + kind + " +" + k + " frame " + Graphics.frameCount + ": sheet ready " + bmp.isReady() + "; rebuildItems query finds it " + found + " (" + hits + " hit(s), near " + (win ? (win.dx + win.cols / 2) + "," + (win.dy + win.rows / 2) : "-") + "); tracked " + !!s + "; visible " + (s ? s.visible : "-") + "; plane level " + (pl && pl.level ? pl.level.z : "-") + "; window y " + (win && win.y0) + ".." + (win && win.y1) + "; item (" + it.x + "," + it.y + "," + it.z + ")");
                    if (k < 60) await t.waitFrames(1);
                }
                t.check(kind + "_item_drawn", firstVisible >= 0, "item " + itemTypeId + " x3 at (" + ic.x + "," + ic.y + ",+1), view centre (" + cx + "," + cy + "): sheet ready at +" + firstReady + ", found by the plane's query at +" + firstFound + ", sprite visible at +" + firstVisible + " frame(s) (-1: never in 60)");
            }
        }, { isDefault: false });
    };
})();
`;
fs.writeFileSync(path.join(__dirname, "game", "js", "plugins", "DEUS_B1Repro.js"), REPRO);
console.log("wrote DEUS_B1Repro.js");
