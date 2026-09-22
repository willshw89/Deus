#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'profile_live_frames');

try { fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true }); } catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

function instrumentPlugin(filename, search, replace) {
    const p = path.join(SNAPSHOT_DIR, 'js', 'plugins', filename);
    let code = fs.readFileSync(p, 'utf8');
    if (!code.includes(search)) {
        console.error(`FAILED to find search target in ${filename}`);
        process.exit(1);
    }
    code = code.replace(search, replace);
    fs.writeFileSync(p, code, 'utf8');
}

// Instrument Graphics._onTick in snapshot rmmz_core.js
const rmmzCorePath = path.join(SNAPSHOT_DIR, 'js', 'rmmz_core.js');
let rmmzCoreCode = fs.readFileSync(rmmzCorePath, 'utf8');
rmmzCoreCode = rmmzCoreCode.replace(
    'Graphics._onTick = function(deltaTime) {',
    `Graphics._onTick = function(deltaTime) {
        if (!window.__TIMINGS__) window.__TIMINGS__ = {};
        if (!window.__TIMINGS__.raf_delta) window.__TIMINGS__.raf_delta = [];
        if (!window.__TIMINGS__.tick_handler) window.__TIMINGS__.tick_handler = [];
        if (!window.__TIMINGS__.pixi_render) window.__TIMINGS__.pixi_render = [];
        const _now = performance.now();
        if (Graphics.__lastTickTime) {
            window.__TIMINGS__.raf_delta.push(_now - Graphics.__lastTickTime);
        }
        Graphics.__lastTickTime = _now;
        const _t0Tick = performance.now();`
);
rmmzCoreCode = rmmzCoreCode.replace(
    'if (this._canRender()) {\n        this._app.render();\n    }',
    `if (this._tickHandler) {}
    window.__TIMINGS__.tick_handler.push(performance.now() - _t0Tick);
    if (this._canRender()) {
        const _t0Render = performance.now();
        this._app.render();
        window.__TIMINGS__.pixi_render.push(performance.now() - _t0Render);
    }`
);
fs.writeFileSync(rmmzCorePath, rmmzCoreCode, 'utf8');

// Instrument SceneManager in snapshot rmmz_managers.js
// Instrument SceneManager in snapshot rmmz_managers.js
const rmmzManagersPath = path.join(SNAPSHOT_DIR, 'js', 'rmmz_managers.js');
let rmmzMgrCode = fs.readFileSync(rmmzManagersPath, 'utf8');
rmmzMgrCode = rmmzMgrCode.replace(
    'const n = this.determineRepeatNumber(deltaTime);',
    `const n = this.determineRepeatNumber(deltaTime);
    if (window.__TIMINGS__) {
        if (!window.__TIMINGS__.repeat_n) window.__TIMINGS__.repeat_n = [];
        window.__TIMINGS__.repeat_n.push(n);
    }`
);
rmmzMgrCode = rmmzMgrCode.replace(
    'SceneManager.updateMain = function() {\n    this.updateFrameCount();\n    this.updateInputData();\n    this.updateEffekseer();\n    this.changeScene();\n    this.updateScene();\n};',
    `SceneManager.updateMain = function() {
        const _t0Main = performance.now();
        const _t0In = performance.now();
        this.updateFrameCount();
        this.updateInputData();
        const _dtIn = performance.now() - _t0In;
        const _t0Eff = performance.now();
        this.updateEffekseer();
        const _dtEff = performance.now() - _t0Eff;
        this.changeScene();
        const _t0Scn = performance.now();
        this.updateScene();
        const _dtScn = performance.now() - _t0Scn;
        const _dtMain = performance.now() - _t0Main;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.update_main) window.__TIMINGS__.update_main = [];
            window.__TIMINGS__.update_main.push(_dtMain);
            if (!window.__TIMINGS__.main_input) window.__TIMINGS__.main_input = [];
            window.__TIMINGS__.main_input.push(_dtIn);
            if (!window.__TIMINGS__.main_eff) window.__TIMINGS__.main_eff = [];
            window.__TIMINGS__.main_eff.push(_dtEff);
            if (!window.__TIMINGS__.main_scene) window.__TIMINGS__.main_scene = [];
            window.__TIMINGS__.main_scene.push(_dtScn);
        }
    };`
);
rmmzMgrCode = rmmzMgrCode.replace(
    'SceneManager.updateScene = function() {\n    if (this._scene) {\n        if (this._scene.isStarted()) {\n            if (this.isGameActive()) {\n                this._scene.update();\n            }\n        } else if (this._scene.isReady()) {\n            this.onBeforeSceneStart();\n            this._scene.start();\n            this.onSceneStart();\n        }\n    }\n};',
    `SceneManager.updateScene = function() {
        if (this._scene) {
            if (this._scene.isStarted()) {
                if (this.isGameActive()) {
                    const _t0ScnUp = performance.now();
                    this._scene.update();
                    const _dtScnUp = performance.now() - _t0ScnUp;
                    if (window.__TIMINGS__) {
                        if (!window.__TIMINGS__.scene_update_outer) window.__TIMINGS__.scene_update_outer = [];
                        window.__TIMINGS__.scene_update_outer.push(_dtScnUp);
                    }
                }
            } else if (this._scene.isReady()) {
                this.onBeforeSceneStart();
                this._scene.start();
                this.onSceneStart();
            }
        }
    };`
);
fs.writeFileSync(rmmzManagersPath, rmmzMgrCode, 'utf8');

// Instrument Scene_Base and Scene_Map in snapshot rmmz_scenes.js
const rmmzScenesPath = path.join(SNAPSHOT_DIR, 'js', 'rmmz_scenes.js');
let rmmzScenesCode = fs.readFileSync(rmmzScenesPath, 'utf8');
rmmzScenesCode = rmmzScenesCode.replace(
    'Scene_Base.prototype.updateChildren = function() {\n    for (const child of this.children) {\n        if (child.update) {\n            child.update();\n        }\n    }\n};',
    `Scene_Base.prototype.updateChildren = function() {
        const _t0Kids = performance.now();
        for (const child of this.children) {
            if (child.update) {
                const _t0C = performance.now();
                child.update();
                const _dtC = performance.now() - _t0C;
                if (window.__TIMINGS__ && _dtC > 0.5) {
                    const cname = child.constructor ? child.constructor.name : "unknown";
                    const k = "child_" + cname;
                    if (!window.__TIMINGS__[k]) window.__TIMINGS__[k] = [];
                    window.__TIMINGS__[k].push(_dtC);
                }
            }
        }
        const _dtKids = performance.now() - _t0Kids;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.scene_updateChildren) window.__TIMINGS__.scene_updateChildren = [];
            window.__TIMINGS__.scene_updateChildren.push(_dtKids);
        }
    };`
);
rmmzScenesCode = rmmzScenesCode.replace(
    'Scene_Map.prototype.update = function() {\n    Scene_Message.prototype.update.call(this);\n    this.updateDestination();\n    this.updateMenuButton();\n    this.updateMapNameWindow();\n    this.updateMainMultiply();\n    if (this.isSceneChangeOk()) {\n        this.updateScene();\n    } else if (SceneManager.isNextScene(Scene_Battle)) {\n        this.updateEncounterEffect();\n    }\n    this.updateWaitCount();\n};',
    `Scene_Map.prototype.update = function() {
        const _t0Map = performance.now();
        const _t0Msg = performance.now();
        Scene_Message.prototype.update.call(this);
        const _dtMsg = performance.now() - _t0Msg;
        this.updateDestination();
        this.updateMenuButton();
        this.updateMapNameWindow();
        const _t0Mult = performance.now();
        this.updateMainMultiply();
        const _dtMult = performance.now() - _t0Mult;
        if (this.isSceneChangeOk()) {
            this.updateScene();
        } else if (SceneManager.isNextScene(Scene_Battle)) {
            this.updateEncounterEffect();
        }
        this.updateWaitCount();
        const _dtMap = performance.now() - _t0Map;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.core_scene_map) window.__TIMINGS__.core_scene_map = [];
            window.__TIMINGS__.core_scene_map.push(_dtMap);
            if (!window.__TIMINGS__.core_msg_children) window.__TIMINGS__.core_msg_children = [];
            window.__TIMINGS__.core_msg_children.push(_dtMsg);
            if (!window.__TIMINGS__.core_map_multiply) window.__TIMINGS__.core_map_multiply = [];
            window.__TIMINGS__.core_map_multiply.push(_dtMult);
        }
    };`
);
rmmzScenesCode = rmmzScenesCode.replace(
    'Scene_Map.prototype.updateMain = function() {',
    `Scene_Map.prototype.updateMain = function() {
        const _t0MapMain = performance.now();`
);
rmmzScenesCode = rmmzScenesCode.replace(
    '$gameScreen.update();\n};',
    `$gameScreen.update();
    if (window.__TIMINGS__) {
        if (!window.__TIMINGS__.game_map_main) window.__TIMINGS__.game_map_main = [];
        window.__TIMINGS__.game_map_main.push(performance.now() - _t0MapMain);
    }
};`
);
fs.writeFileSync(rmmzScenesPath, rmmzScenesCode, 'utf8');

// Instrument Spriteset_Map in snapshot rmmz_sprites.js
const rmmzSpritesPath = path.join(SNAPSHOT_DIR, 'js', 'rmmz_sprites.js');
let rmmzSpritesCode = fs.readFileSync(rmmzSpritesPath, 'utf8');
rmmzSpritesCode = rmmzSpritesCode.replace(
    'Spriteset_Map.prototype.update = function() {\n    Spriteset_Base.prototype.update.call(this);\n    this.updateTileset();\n    this.updateParallax();\n    this.updateTilemap();\n    this.updateShadow();\n    this.updateWeather();\n    this.updateAnimations();\n    this.updateBalloons();\n};',
    `Spriteset_Map.prototype.update = function() {
        const _t0Spriteset = performance.now();
        Spriteset_Base.prototype.update.call(this);
        const _dtBase = performance.now() - _t0Spriteset;
        const _t0Tilemap = performance.now();
        this.updateTileset();
        this.updateParallax();
        this.updateTilemap();
        this.updateShadow();
        this.updateWeather();
        this.updateAnimations();
        this.updateBalloons();
        const _dtTilemap = performance.now() - _t0Tilemap;
        const _dtTotal = performance.now() - _t0Spriteset;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.spriteset_total) window.__TIMINGS__.spriteset_total = [];
            window.__TIMINGS__.spriteset_total.push(_dtTotal);
            if (!window.__TIMINGS__.spriteset_base) window.__TIMINGS__.spriteset_base = [];
            window.__TIMINGS__.spriteset_base.push(_dtBase);
            if (!window.__TIMINGS__.spriteset_tilemap) window.__TIMINGS__.spriteset_tilemap = [];
            window.__TIMINGS__.spriteset_tilemap.push(_dtTilemap);
        }
    };`
);
fs.writeFileSync(rmmzSpritesPath, rmmzSpritesCode, 'utf8');

// 1. Initialize timings in UF_Core.js
instrumentPlugin('UF_Core.js',
    '(() => {',
    '(() => { if (!window.__TIMINGS__) window.__TIMINGS__ = {}; Object.assign(window.__TIMINGS__, { Colonists_scan: [], Colonists_total: [], Jobs: [], Wildlife: [], Combat: [], Fire: [], Fog: [], Environment: [], CoreMapEvents: [] });'
);

// 2. UF_Colonists.js
instrumentPlugin('UF_Colonists.js',
    'function scan() {',
    `function scan() {
        const _scanT0 = performance.now();
        let _tBeforeLoop = 0, _tSimUnits = 0, _tJob0 = 0, _tInJob = 0, _tInDecide = 0;
        const _t0A = performance.now();`
);
instrumentPlugin('UF_Colonists.js',
    'let decideCount = 0;\n        let lowPriorityPreempted = false;\n        const MAX_DECIDE_PER_SCAN = 1;\n        for (const u of simulationUnits()) {',
    `_tBeforeLoop = performance.now() - _t0A;
        let decideCount = 0;
        let lowPriorityPreempted = false;
        const MAX_DECIDE_PER_SCAN = 1;
        const _t0Sim = performance.now();
        const _simUnits = simulationUnits();
        _tSimUnits = performance.now() - _t0Sim;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.scan_before) window.__TIMINGS__.scan_before = [];
            window.__TIMINGS__.scan_before.push(_tBeforeLoop);
            if (!window.__TIMINGS__.scan_simUnits) window.__TIMINGS__.scan_simUnits = [];
            window.__TIMINGS__.scan_simUnits.push(_tSimUnits);
            window.__TIMINGS__.simUnits_len = [_simUnits.length];
            window.__TIMINGS__.simUnits_sameLevel = [_simUnits.filter(u => sameLevel(u, c)).length];
        }
        const _tLoop0 = performance.now();
        for (const u of _simUnits) {`
);
instrumentPlugin('UF_Colonists.js',
    'decisionAt.set(u.id, t);\n            }\n        }\n    }',
    `decisionAt.set(u.id, t);\n            }\n        }\n        if (window.__TIMINGS__) {\n            if (!window.__TIMINGS__.scan_loop) window.__TIMINGS__.scan_loop = [];\n            window.__TIMINGS__.scan_loop.push(performance.now() - _tLoop0);\n        }\n    }`
);
instrumentPlugin('UF_Colonists.js',
    'if (job) {',
    'if (job) { _tJob0 = performance.now();'
);
instrumentPlugin('UF_Colonists.js',
    'const lastDecide = decisionAt.get(u.id) || -Infinity;',
    `if (job && window.__TIMINGS__) {
                if (!window.__TIMINGS__.scan_jobBranch) window.__TIMINGS__.scan_jobBranch = [];
                window.__TIMINGS__.scan_jobBranch.push(performance.now() - _tJob0);
            }
            const lastDecide = decisionAt.get(u.id) || -Infinity;`
);
instrumentPlugin('UF_Colonists.js',
    'const res = decide(u);',
    `const _tDecide0 = performance.now();
                const res = decide(u);
                if (window.__TIMINGS__) {
                    if (!window.__TIMINGS__.scan_decideCall) window.__TIMINGS__.scan_decideCall = [];
                    window.__TIMINGS__.scan_decideCall.push(performance.now() - _tDecide0);
                }`
);
instrumentPlugin('UF_Colonists.js',
    'return designationJob(u) || getPlanSpec() || haulerStaging() || footprintClearingJob(u) || constructionHaulingJob(u) || tidyStockpileJob(u) || tryMakeBed() || autonomousCallingJob(u) || autonomousFrontierProgression(u) || idleJob(u);',
    `const _t1 = performance.now();
        const j1 = designationJob(u);
        const dtDesig = performance.now() - _t1;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.desig) window.__TIMINGS__.desig = [];
            window.__TIMINGS__.desig.push(dtDesig);
        }
        if (j1) return j1;

        const _t2 = performance.now();
        const jPlan = getPlanSpec();
        const dtPlan = performance.now() - _t2;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.plan) window.__TIMINGS__.plan = [];
            window.__TIMINGS__.plan.push(dtPlan);
        }
        if (jPlan) return jPlan;

        const _t3 = performance.now();
        const jTidy = tidyStockpileJob(u);
        const dtTidy = performance.now() - _t3;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.tidy) window.__TIMINGS__.tidy = [];
            window.__TIMINGS__.tidy.push(dtTidy);
        }
        if (jTidy) return jTidy;

        const _t4 = performance.now();
        const jFrontier = autonomousFrontierProgression(u);
        const dtFrontier = performance.now() - _t4;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.frontier) window.__TIMINGS__.frontier = [];
            window.__TIMINGS__.frontier.push(dtFrontier);
        }
        if (jFrontier) return jFrontier;

        return haulerStaging() || footprintClearingJob(u) || constructionHaulingJob(u) || (tryMakeBed ? tryMakeBed() : null) || autonomousCallingJob(u) || idleJob(u);`
);

instrumentPlugin('UF_Colonists.js',
    'if (localTicks % SCAN_EVERY === 0) scan();',
    'if (localTicks % SCAN_EVERY === 0) { const _st0 = performance.now(); scan(); if (window.__TIMINGS__) window.__TIMINGS__.Colonists_scan.push(performance.now() - _st0); }'
);
instrumentPlugin('UF_Colonists.js',
    'localTicks++;\n\n        if (localTicks === 1 || localTicks % 300 === 0) ensureColonistsGeneticsAndAging();',
    'const _ct0 = performance.now(); localTicks++;\n\n        if (localTicks === 1 || localTicks % 300 === 0) ensureColonistsGeneticsAndAging();'
);
instrumentPlugin('UF_Colonists.js',
    'stepMerchantCaravan();\n            }\n        }\n    };',
    'stepMerchantCaravan();\n            }\n        }\n        if (window.__TIMINGS__) window.__TIMINGS__.Colonists_total.push(performance.now() - _ct0);\n    };'
);

// 3. UF_Jobs.js
instrumentPlugin('UF_Jobs.js',
    '_Game_Map_update.call(this, sceneActive); // UF_World moved the units first (its alias is below ours)\n        update();',
    '_Game_Map_update.call(this, sceneActive);\n        const _jt0 = performance.now();\n        update();\n        if (window.__TIMINGS__) window.__TIMINGS__.Jobs.push(performance.now() - _jt0);'
);

// 4. UF_Wildlife.js
instrumentPlugin('UF_Wildlife.js',
    '_Game_Map_update.call(this, sceneActive);\n        tick();',
    '_Game_Map_update.call(this, sceneActive);\n        const _wt0 = performance.now();\n        tick();\n        if (window.__TIMINGS__) window.__TIMINGS__.Wildlife.push(performance.now() - _wt0);'
);

// 5. UF_Combat.js
instrumentPlugin('UF_Combat.js',
    'const t0 = performance.now();\n        try {\n            step();\n        } catch (e) {\n            report("step", e);\n        }',
    'const t0 = performance.now();\n        try {\n            step();\n        } catch (e) {\n            report("step", e);\n        }\n        if (window.__TIMINGS__) window.__TIMINGS__.Combat.push(performance.now() - t0);'
);

// 6. UF_Fog.js
instrumentPlugin('UF_Fog.js',
    '_Game_Map_update.call(this, sceneActive);\n        if (++frame % UPDATE_FRAMES === 0) Fog.refresh();',
    '_Game_Map_update.call(this, sceneActive);\n        const _ft0 = performance.now();\n        if (++frame % UPDATE_FRAMES === 0) Fog.refresh();\n        if (window.__TIMINGS__) window.__TIMINGS__.Fog.push(performance.now() - _ft0);'
);

// 7. UF_Environment.js
instrumentPlugin('UF_Environment.js',
    'Game_Map.prototype.update = function(sceneActive) {\n        _Game_Map_update.call(this, sceneActive);\n        frameCount++;\n        updateEnvironment();\n    };',
    'Game_Map.prototype.update = function(sceneActive) {\n        _Game_Map_update.call(this, sceneActive);\n        const _et0 = performance.now();\n        frameCount++;\n        updateEnvironment();\n        if (window.__TIMINGS__) window.__TIMINGS__.Environment.push(performance.now() - _et0);\n    };'
);

// 8. UF_Perspective25D.js
instrumentPlugin('UF_Perspective25D.js',
    'Sprite_Character.prototype.update = function() {\n        _Sprite_Character_update.call(this);\n        this.update2DShadow();\n        this.updateOcclusion();\n    };',
    `Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        const _t0Sh = performance.now();
        this.update2DShadow();
        const _dtSh = performance.now() - _t0Sh;
        const _t0Occ = performance.now();
        this.updateOcclusion();
        const _dtOcc = performance.now() - _t0Occ;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.p25d_shadow) window.__TIMINGS__.p25d_shadow = [];
            window.__TIMINGS__.p25d_shadow.push(_dtSh);
            if (!window.__TIMINGS__.p25d_occlusion) window.__TIMINGS__.p25d_occlusion = [];
            window.__TIMINGS__.p25d_occlusion.push(_dtOcc);
        }
    };`
);

// 9. UF_Interact.js
instrumentPlugin('UF_Interact.js',
    'Spriteset_Map.prototype.update = function() {\n        _Spriteset_Map_update.call(this);\n        if (this._ufDesignations) this._ufDesignations.sync();\n    };',
    `Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        const _t0D = performance.now();
        if (this._ufDesignations) this._ufDesignations.sync();
        const _dtD = performance.now() - _t0D;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.interact_sync) window.__TIMINGS__.interact_sync = [];
            window.__TIMINGS__.interact_sync.push(_dtD);
        }
    };`
);

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const hookCode = `
        t.screenshot("map");

        // Advance 120 frames using t.waitFrames
        await t.waitFrames(120);

        const avg = arr => arr && arr.length ? (arr.reduce((a,b)=>a+b, 0) / arr.length).toFixed(2) : "0.00";
        const steadyAvg = arr => arr && arr.length > 10 ? (arr.slice(10).reduce((a,b)=>a+b, 0) / (arr.length - 10)).toFixed(2) : avg(arr);
        const max = arr => arr && arr.length ? Math.max(...arr).toFixed(2) : "0.00";

        let lines = [];
        const tim = window.__TIMINGS__ || {};
        for (const k of Object.keys(tim)) {
            lines.push(k + ": steady=" + steadyAvg(tim[k]) + "ms, avg=" + avg(tim[k]) + "ms, max=" + max(tim[k]) + "ms (calls=" + (tim[k] ? tim[k].length : 0) + ")");
        }

        const summary = lines.join(" | ");
        console.log("PROFILER_OUTPUT: " + summary);

        t.check("profiler_summary", true, summary);
`;

testCode = testCode.replace(targetHook, hookCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running profiler harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Test harness failed:', e.stdout || e.message);
    process.exit(1);
}
