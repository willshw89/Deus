"use strict";
// --mutate-z drops the requested level before object inspection: must fail.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Walls.js"), "utf8");
if (process.argv.includes("--mutate-z")) {
    const target = "const same = O.atIn(area, x, y);";
    assert(source.includes(target), "mutation target missing");
    source = source.replace(target, "area = { x: area.x, y: area.y }; const same = O.atIn(area, x, y);");
}
let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); passed++; console.log(`PASS walls_z.${name}`); }
    catch (e) { failed++; console.error(`FAIL walls_z.${name}: ${e.message}`); }
}
function fixture(levels) {
    const cells = new Map(), reads = [];
    const W = levels ? { viewLevel() {}, levelKey() {}, levelOfMapId() {} } : {};
    function Scene_Boot() {} Scene_Boot.prototype.start = function() {};
    const types = { 1: { id: "TEST_wall_ground", tags: ["wall"] }, 2: { id: "TEST_wall_lower", tags: ["wall"] } };
    const ctx = { console, Scene_Boot, UF: { World: W, Objects: {
        type: n => types[n], atIn(a, x, y) { reads.push(a); return cells.get(`${levels ? a.z || 0 : 0}:${x},${y}`) || null; }
    } } };
    ctx.window = ctx; vm.runInNewContext(source, ctx, { filename: "UF_Walls.js" });
    cells.set("0:5,5", types[1]); cells.set("-1:5,5", types[2]);
    return { walls: ctx.UF.Walls, cells, types, reads };
}
const ground = { x: 0, y: 0 }, lower = { x: 0, y: 0, z: -1 }, old = fixture(false), f = fixture(true);
check("legacy_lookup", () => assert.strictEqual(old.walls.baseAt(ground, 5, 5).type.id, "TEST_wall_ground"));
check("legacy_nonzero_refused", () => {
    const count = old.reads.length; assert.strictEqual(old.walls.baseAt(lower, 5, 5), null); assert.strictEqual(old.reads.length, count);
});
check("invalid_level_refused", () => {
    for (const z of [3, -3, 0.5, null, "-1", NaN]) assert.strictEqual(f.walls.baseAt({ x: 0, y: 0, z }, 5, 5), null);
});
check("same_xy_level_isolated", () => {
    assert.strictEqual(f.walls.baseAt(ground, 5, 5).type.id, "TEST_wall_ground");
    assert.strictEqual(f.walls.baseAt(lower, 5, 5).type.id, "TEST_wall_lower");
});
check("roof_stays_same_level", () => {
    const at = f.walls.baseAt(lower, 5, 4);
    assert.strictEqual(at.role, "roof"); assert.strictEqual(at.y, 5); assert.strictEqual(at.area.z, -1);
    assert.strictEqual(at.type.id, "TEST_wall_lower");
    assert.strictEqual(JSON.stringify(f.walls.visualCells(5, 5)), '[{"x":5,"y":4,"role":"roof"},{"x":5,"y":5,"role":"wall"}]');
});
check("level_grid_masks", () => {
    const a = new Array(25).fill(0), b = new Array(25).fill(0);
    a[12] = a[13] = 1; b[12] = b[7] = 2;
    assert.strictEqual(f.walls.maskAt(a, 5, 5, 2, 2), 2);
    assert.strictEqual(f.walls.maskAt(b, 5, 5, 2, 2), 1);
});
check("level_identity_serializes", () => {
    const saved = JSON.parse(JSON.stringify(f.walls.baseAt(lower, 5, 4)));
    assert.strictEqual(saved.area.z, -1); assert.strictEqual(saved.type.id, "TEST_wall_lower"); assert.strictEqual(saved.role, "roof");
});
console.log(`RESULT: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
