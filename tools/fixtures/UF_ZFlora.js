/*:
 * @target MZ
 * @plugindesc [UF Test Fixture] Underground flora generation, harvest, regrowth and display; disposable snapshots only.
 * @base UF_Levels
 * @help Never register in the live game. Run the underground_flora suite in a fresh snapshot.
 */
(() => {
    "use strict";
    const boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        boot.call(this);
        if (!UF.Test || !UF.Test.active) return;
        UF.Test.suite("underground_flora", async t => {
            const W = UF.World, G = UF.WorldGen, L = UF.Levels, O = UF.Objects, I = UF.Items;
            const state = W.state, size = state.size, paused = UF.Time && UF.Time.paused;
            if (UF.Time) UF.Time.pause();
            const problems = [], rows = [], fixtures = [], naturalSets = [];
            const vegetation = o => (o.tags || []).some(tag => ["plant", "tree", "bush", "food", "fruit", "fiber", "straw"].includes(tag));
            const show = async (z, center) => {
                if (W.viewLevel().z !== z) {
                    L.setView(z, { center });
                    await t.waitUntil(() => !L.switching() && !$gamePlayer.isTransferring() && W.viewLevel() && W.viewLevel().z === z, 20000, `level ${z}`);
                }
                if (center) $gamePlayer.locate(center.x, center.y);
                await t.waitFrames(8);
            };
            try {
                for (const z of [-1, -2]) {
                    const config = G.undergroundKitConfig(z), allowed = new Set(Object.keys(config.objects).concat(config.natural.map(p => p.id)));
                    naturalSets.push(new Set(config.natural.map(p => p.id)));
                    const queue = [...allowed];
                    for (let q = 0; q < queue.length; q++) {
                        const type = O.type(queue[q]);
                        if (!type) continue;
                        for (const action of Object.values(type.actions || {})) if (action.becomes && !allowed.has(action.becomes)) { allowed.add(action.becomes); queue.push(action.becomes); }
                    }
                    let floraCount = 0, outsideCamp = 0;
                    for (let ay = 0; ay < state.areasY; ay++) for (let ax = 0; ax < state.areasX; ax++) {
                        const map = W.buildArea(ax, ay, z), centers = G.kitCentres(ax, ay, z);
                        for (let i = 0; i < map.ufObjects.length; i++) {
                            const type = O.type(map.ufObjects[i]);
                            if (!type || !vegetation(type)) continue;
                            floraCount++;
                            if (!(type.tags || []).includes("underground") || !allowed.has(type.id)) problems.push(`${z}: ${type.id} at ${ax},${ay}:${i % size},${Math.floor(i / size)}`);
                            if (!centers.some(c => Math.hypot(i % size - c.x, Math.floor(i / size) - c.y) <= config.radius[1])) outsideCamp++;
                        }
                    }
                    rows.push({ z, floraCount, outsideCamp });
                    if (!floraCount || !outsideCamp) problems.push(`${z}: flora=${floraCount}, outside kits=${outsideCamp}`);
                }
                t.check("generated_depth_flora", problems.length === 0, `${JSON.stringify(rows)} ${problems.slice(0, 10).join(" | ")}`);
                t.check("depths_have_distinct_plants", naturalSets.length === 2 && [...naturalSets[0]].every(id => !naturalSets[1].has(id)), JSON.stringify(naturalSets.map(s => [...s])));

                // Six displayed forms per depth: three living plants and their harvested states, on actual cave floor.
                for (const z of [-1, -2]) {
                    const area = { x: 0, y: 0, z }, config = G.undergroundKitConfig(z);
                    const ids = [...new Set(config.natural.map(p => p.id))].slice(0, 3);
                    const offsets = [-3, 0, 3];
                    const pocket = L.habitablePockets(z, 0, 0).find(p => offsets.every(dx => [-1, 2].every(dy => {
                        const ref = { area, x: p.x + dx, y: p.y + dy, z };
                        return L.standableShape(ref) && !L.cellAt(ref).water && !W.unitsInArea(0, 0, z).some(u => u.x === ref.x && u.y === ref.y);
                    })));
                    if (!pocket || ids.length !== 3) { t.check(`fixture_${-z}`, false, "No clear natural pocket or fewer than three flora types"); continue; }
                    const shown = [];
                    ids.forEach((id, i) => {
                        const type = O.type(id), action = Object.keys(type.actions || {})[0];
                        const picked = action && type.actions[action].becomes;
                        const x = pocket.x + offsets[i], y = pocket.y - 1;
                        if (!picked || !O.type(picked)) return;
                        O.setIn(area, x, y, id); O.setIn(area, x, y + 3, picked);
                        shown.push({ id, x, y }, { id: picked, x, y: y + 3 });
                        fixtures.push({ area, z, x, y, id, action, picked });
                    });
                    O.setIn(area, pocket.x, pocket.y + 4, "campfire");
                    if (UF.Camera) UF.Camera.setLevel(0);
                    await show(z, pocket);
                    await t.waitUntil(() => ImageManager.isReady(), 12000, "stock cave-plant sheets");
                    await t.waitFrames(12);
                    const drawn = shown.filter(p => {
                        const sprite = O.spriteAt(p.x, p.y), b = sprite && sprite.bitmap, f = sprite && sprite._frame;
                        if (!sprite || !sprite.visible || !b || !b.isReady() || !f || !sprite._ufType || sprite._ufType.id !== p.id) return false;
                        for (let y = f.y; y < f.y + f.height; y += 4) for (let x = f.x; x < f.x + f.width; x += 4) if (b.getAlphaPixel(x, y) > 0) return true;
                        return false;
                    });
                    t.screenshot(`forms_minus${-z}`);
                    t.check(`six_forms_drawn_${-z}`, shown.length === 6 && drawn.length === 6, `${drawn.length}/6 visible, loaded, opaque forms: ${shown.map(p => p.id).join(", ")}`);
                }

                await show(0);
                const harvestProblems = [], ground = new Map();
                for (const f of fixtures) {
                    const key = `${f.x},${f.y}`;
                    if (!ground.has(key)) ground.set(key, { object: O.typeIdIn({ x: 0, y: 0, z: 0 }, f.x, f.y), items: JSON.stringify(I.atIn({ x: 0, y: 0, z: 0 }, f.x, f.y)) });
                    const yields = O.type(f.id).actions[f.action].yields || {};
                    const before = Object.fromEntries(Object.keys(yields).map(id => [id, I.count({ area: f.area, x: f.x, y: f.y, z: f.z }, id)]));
                    const result = O.applyIn(f.area, f.x, f.y, f.action);
                    if (!result || result.z !== f.z || O.atIn(f.area, f.x, f.y).id !== f.picked) harvestProblems.push(`${f.id}: harvest level/state wrong`);
                    for (const [id, count] of Object.entries(yields)) if (I.count({ area: f.area, x: f.x, y: f.y, z: f.z }, id) - before[id] !== count) harvestProblems.push(`${f.id}: ${id} yield wrong`);
                    f.pending = O.regrowList().find(r => r.z === f.z && r.x === f.x && r.y === f.y);
                    if (!f.pending) harvestProblems.push(`${f.id}: no same-level regrow record`);
                }
                t.check("harvest_while_viewing_ground", fixtures.length === 6 && harvestProblems.length === 0 && W.viewLevel().z === 0, harvestProblems.join(" | ") || "all six plant types harvested on their own maps while Ground is displayed");
                const saved = JsonEx.parse(JsonEx.stringify(DataManager.makeSaveContents()));
                t.check("regrowth_saved_with_level", fixtures.length === 6 && fixtures.every(f => f.pending && saved.ufWorld.regrow.some(r => r.z === f.z && r.x === f.x && r.y === f.y && r.to === O.typeId(f.id))), "actual save serialization retains every pending depth-specific regrowth");
                const due = Math.max(...fixtures.filter(f => f.pending).map(f => f.pending.due));
                // Use the real clock's hour event, not a direct rewrite of a regrowth record or object.
                for (let n = 0; O.hourNow() < due && n < 200; n++) $ufTime.advanceMinute(60);
                const regrown = fixtures.filter(f => O.atIn(f.area, f.x, f.y) && O.atIn(f.area, f.x, f.y).id === f.id);
                t.check("regrow_offscreen_at_due", fixtures.length === 6 && regrown.length === 6 && O.hourNow() >= due && W.viewLevel().z === 0, `${regrown.length}/6 regrown; hour ${O.hourNow()}, last due ${due}; view ${W.viewLevel().z}`);
                const isolated = [...ground].every(([key, before]) => { const [x, y] = key.split(",").map(Number); return before.object === O.typeIdIn({ x: 0, y: 0, z: 0 }, x, y) && before.items === JSON.stringify(I.atIn({ x: 0, y: 0, z: 0 }, x, y)); });
                t.check("ground_objects_and_items_unchanged", ground.size > 0 && isolated, `${ground.size} matching Ground cells compared before/after harvest and due-hour regrowth`);
                t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
            } finally { if (UF.Time && !paused) UF.Time.resume(); }
        }, { isDefault: false });
    };
})();
