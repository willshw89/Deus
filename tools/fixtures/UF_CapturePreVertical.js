/*:
 * @target MZ
 * @plugindesc [UF Test Fixture] Capture a real pre-vertical save in a disposable snapshot only.
 * @base UF_World
 * @help Never register in the live game. Run only the capture_pre_vertical suite.
 */
(() => {
    "use strict";
    if (!Utils.isNwjs()) return;
    const argv = nw.App.argv || [];
    if (!argv.includes("--uf-test=capture_pre_vertical")) return;
    const makeWorld = UF.World.newWorld;
    UF.World.newWorld = function(seed) { return makeWorld.call(this, seed === undefined ? 424242 : seed); };
    const boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        boot.call(this);
        UF.Test.suite("capture_pre_vertical", async t => {
            const W = UF.World, area = W.currentArea(), st = W.state;
            const legacy = !!area && st.version === 3 && !st.levels && typeof W.viewLevel !== "function";
            t.check("legacy_core", legacy, `version ${st.version}; seed ${st.seed}; viewLevel ${typeof W.viewLevel}`);
            if (!legacy) return;
            const x = $gamePlayer.x, y = $gamePlayer.y;
            W.setTile(area.x, area.y, x, y, 0, W.getTile(area.x, area.y, x, y, 0));
            UF.Items.drop(area, x, y, "log", 3);
            UF.Jobs.create({ type: "move", target: { area, x, y }, owner: null });
            const map = W.buildArea(area.x, area.y);
            const hash = arr => { let h = 2166136261 >>> 0; for (const n of arr) { h ^= (n | 0) & 0xffff; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
            const contents = DataManager.makeSaveContents(), json = JsonEx.stringify(contents);
            const payload = pako.deflate(json, { to: "string", level: 1 });
            const fs = require("fs"), path = require("path"), root = nw.__dirname || process.cwd();
            const out = path.join(root, "test_fixtures");
            fs.mkdirSync(out, { recursive: true });
            const meta = { made: "2026-09-19", version: st.version, seed: st.seed, mapId: $gameMap.mapId(), tiles: hash(map.data), objects: hash(map.ufObjects), source: "codex_zcore_pre_v80_control_20260919; fixed seed before Z merge, current terrain generator" };
            fs.writeFileSync(path.join(out, "vertical_pre_v80.rmmzsave"), payload, "utf8");
            fs.writeFileSync(path.join(out, "vertical_pre_v80.meta.json"), JSON.stringify(meta, null, 2) + "\n");
            const round = JsonEx.parse(pako.inflate(fs.readFileSync(path.join(out, "vertical_pre_v80.rmmzsave"), "utf8"), { to: "string" }));
            t.check("roundtrip", JSON.stringify(round.ufWorld) === JSON.stringify(st), `${Object.keys(st.units).length} units; ${Object.keys(st.items.byId).length} items; ${st.jobs.list.length} jobs; tiles ${meta.tiles}; objects ${meta.objects}`);
            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
        }, { isDefault: false });
    };
})();
