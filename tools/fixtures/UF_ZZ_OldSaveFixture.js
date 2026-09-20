/*:
 * @target MZ
 * @plugindesc [test fixture maker] Writes tools/fixtures/old_save_automaton.rmmzsave from a New Game whose world rolls an automaton faction. Snapshots only; never registered in game/js/plugins.js.
 * @author UF project
 *
 * @help
 * Why: the "peoples" suite (UF_Factions) checks that a save made BEFORE the eleven-peoples change (VISION V87,
 * 2026-09-19) still loads with its automaton faction and units intact (docs/design/PEOPLES.md §4). Such a save has
 * to come from the old code, so this plugin runs in a snapshot of the old game:
 *
 *   1. node tools/test_snapshot.js --name old_fixture --no-run   (a copy of the OLD game/)
 *   2. copy this file into <snapshot>/js/plugins/ and add
 *      {"name":"UF_ZZ_OldSaveFixture","status":true,"description":"","parameters":{}} to the snapshot's
 *      js/plugins.js just before UF_Test
 *   3. node tools/run_tests.js peoplesfixture --game <snapshot>
 *
 * It looks for the first seed from 1 up whose factions include a non-player automaton faction (UF.Factions.generate
 * on a synthetic state), starts a New Game on that seed (UF.World.newWorld wrapped for this one call), lets the map
 * run 120 frames, and writes DataManager.makeSaveContents() in RPG Maker MZ's own save format (JsonEx, zlib
 * deflate, written as a binary string) plus a summary sidecar (.json) naming the seed, the automaton faction and its
 * units. The project folder is found through the snapshot's img junction, so the files land in the real tools/fixtures.
 */
(() => {
    "use strict";
    // UF_Test loads after this file, so the suite is registered at boot, as the UF plugins do.
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && UF.Test && UF.Test.active) register();
    };
    const fs = require("fs");
    const path = require("path");
    const zlib = require("zlib");
    const crypto = require("crypto");

    function projectRoot() {
        const base = nw.__dirname || process.cwd();
        const img = fs.realpathSync(path.join(base, "img")); // a junction to the real game/img in a snapshot
        return path.dirname(path.dirname(img));
    }
    const md5 = file => crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex");

    function register() {
        UF.Test.suite("peoplesfixture", async t => {
            const W = UF.World, F = UF.Factions;
            const st = W.state;
            const fresh = seed => ({ seed, size: st.size, areasX: st.areasX, areasY: st.areasY, startArea: { x: st.startArea.x, y: st.startArea.y } });
            let seed = 0;
            for (let s = 1; s <= 300 && !seed; s++) {
                const f = F.generate(fresh(s));
                if (f && f.list.some(x => x.species === "automaton" && !x.isPlayer)) seed = s;
            }
            t.check("seed_found", seed > 0, `first seed with a non-player automaton faction: ${seed}`);
            if (!seed) return;

            const newWorld = W.newWorld;
            W.newWorld = function(s) { return newWorld.call(this, s || seed); };
            try {
                DataManager.setupNewGame();
                SceneManager.goto(Scene_Map);
                await t.waitUntil(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && W.state && W.state.seed === seed && ImageManager.isReady(), 60000, "the new game's map");
            } finally {
                W.newWorld = newWorld;
            }
            await t.waitFrames(120);

            const d = W.state.factions;
            const auto = d.list.find(x => x.species === "automaton" && !x.isPlayer);
            const units = W.units().filter(u => u.data && u.data.faction === auto.id);
            const contents = DataManager.makeSaveContents();
            const json = JsonEx.stringify(contents);
            const root = projectRoot();
            const dir = path.join(root, "tools", "fixtures");
            fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, "old_save_automaton.rmmzsave");
            fs.writeFileSync(file, zlib.deflateSync(Buffer.from(json, "utf8"), { level: 1 }).toString("latin1"));
            const base = nw.__dirname || process.cwd();
            const summary = {
                about: "A save made by the code BEFORE the eleven-peoples change (VISION V87), for the peoples suite's save_old check. Made by tools/fixtures/UF_ZZ_OldSaveFixture.js in a snapshot of game/; RPG Maker MZ save format (JsonEx, zlib deflate, written as a binary string).",
                made: new Date().toISOString(),
                seed,
                code: {
                    "js/plugins/UF_Factions.js": md5(path.join(base, "js", "plugins", "UF_Factions.js")),
                    "js/plugins/UF_History.js": md5(path.join(base, "js", "plugins", "UF_History.js")),
                    "data/UF_WorldCatalog.json": md5(path.join(base, "data", "UF_WorldCatalog.json"))
                },
                speciesInCatalog: UF.Factions.config().species.map(s => `${s.id}:${s.weight}`),
                factions: d.list.map(f => ({ id: f.id, name: f.name, species: f.species, isPlayer: f.isPlayer })),
                automaton: {
                    factionId: auto.id, name: auto.name, speciesName: F.speciesName(auto.species),
                    units: units.map(u => ({ id: u.id, name: u.name, image: u.image, area: u.area, x: u.x, y: u.y, data: { kind: u.data.kind, species: u.data.species, faction: u.data.faction, gender: u.data.gender, founder: u.data.founder, rank: u.data.rank, tint: u.data.tint || null } }))
                },
                unitCount: W.units().length,
                bytes: { json: json.length }
            };
            fs.writeFileSync(file.replace(/\.rmmzsave$/, ".json"), JSON.stringify(summary, null, 1));
            t.check("fixture_written", fs.existsSync(file) && units.length > 0,
                `${file}: seed ${seed}, ${auto.name} (${auto.id}, ${units.length} units: ${units.map(u => `${u.name} ${u.image.characterName}`).join(", ")}), ${W.units().length} units in all, ${json.length} bytes of JSON`);
        }, { isDefault: false });
    }
})();
