#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'spike_diag');

try { fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true }); } catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {
    if (e.status > 7) throw e;
}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const diagCode = `
    Test.suite("spike_diag", async t => {
        const spikes = [];
        let last = performance.now();
        
        let lastMapTime = 0;
        const origGameMapUpdate = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            const t0 = performance.now();
            origGameMapUpdate.call(this, sceneActive);
            lastMapTime = performance.now() - t0;
        };

        let lastSpritesetTime = 0;
        const origSpritesetUpdate = Spriteset_Map.prototype.update;
        Spriteset_Map.prototype.update = function() {
            const t0 = performance.now();
            origSpritesetUpdate.call(this);
            lastSpritesetTime = performance.now() - t0;
        };

        let lastSceneMapBusy = 0;
        const origSceneMapUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const now = performance.now();
            const delta = now - last;
            last = now;
            const t0 = performance.now();
            origSceneMapUpdate.call(this);
            lastSceneMapBusy = performance.now() - t0;
            if (delta > 45) {
                spikes.push({
                    frame: Graphics.frameCount,
                    delta: parseFloat(delta.toFixed(1)),
                    busy: parseFloat(lastSceneMapBusy.toFixed(1)),
                    map: parseFloat(lastMapTime.toFixed(1)),
                    spriteset: parseFloat(lastSpritesetTime.toFixed(1))
                });
            }
        };

        await t.waitFrames(300); // 5 seconds at 60 fps
        Test.write("SPIKES RECORDED: " + JSON.stringify(spikes, null, 2));
        t.check("diag_done", true);
    }, { isDefault: false });
`;

testCode = testCode.replace('Test.suite("perf",', `${diagCode}\n    Test.suite("perf",`);
fs.writeFileSync(testJsPath, testCode, 'utf8');

const nodePath = process.execPath;
const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js spike_diag --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
console.log(out);
