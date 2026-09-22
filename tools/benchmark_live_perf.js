#!/usr/bin/env node
'use strict';

/**
 * tools/benchmark_live_perf.js
 *
 * In-engine NW.js automated performance benchmark for Project DEUS.
 * Profiles actual runtime execution across:
 * - Scenario A: Founding Camp (8 colonists, starting campfire, ~140 wildlife, active jobs)
 * - Speeds: 1x, 8x, 32x
 * - Measures: Frame time, Tick time, Subsystem breakdown, Achieved speed, Heap memory.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'perf_baseline');

console.log(`Setting up in-engine performance benchmark snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject performance profiling harness into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const profilerSuiteCode = `
    UF.Test.suite("perf_live", async t => {
        const W = window.UF && UF.World;
        const C = window.UF && UF.Colonists;
        const J = window.UF && UF.Jobs;
        const T = window.UF && UF.TimeSpeed;
        const st = W && W.state;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        
        t.check("world_ready", !!st && !!area, "World and area initialized");

        // Metrics container
        const report = {
            runtime: {
                rmmz: Utils.RPGMAKER_VERSION,
                nwjs: (typeof process !== "undefined" && process.versions) ? process.versions["node-webkit"] || process.versions["nw"] : "unknown",
                node: (typeof process !== "undefined" && process.versions) ? process.versions.node : "unknown",
                chromium: (typeof process !== "undefined" && process.versions) ? process.versions.chrome : "unknown",
                pixi: (typeof PIXI !== "undefined") ? PIXI.VERSION : "unknown",
                resolution: \`\${Graphics.boxWidth}x\${Graphics.boxHeight}\`
            },
            entityCounts: {
                colonists: (C && C.list) ? C.list().length : 0,
                totalUnits: W ? W.units().length : 0,
                objects: ($dataMap && $dataMap.ufObjects) ? $dataMap.ufObjects.filter(x => x > 0).length : 0
            },
            speeds: {}
        };

        // Hook instrumented timings
        const metrics = {
            frameCount: 0,
            frameTimes: [],
            busyTimes: [],
            tickTimes: [],
            subsystems: {
                windowUpdateMs: 0,
                spritesetUpdateMs: 0,
                gameMapUpdateMs: 0,
                worldUpdateMs: 0,
                colonistsUpdateMs: 0,
                jobsUpdateMs: 0,
                combatUpdateMs: 0,
                wildlifeUpdateMs: 0,
                ecologyUpdateMs: 0,
                fogUpdateMs: 0
            }
        };

        function resetMetrics() {
            metrics.frameCount = 0;
            metrics.frameTimes = [];
            metrics.busyTimes = [];
            metrics.tickTimes = [];
            for (const k in metrics.subsystems) metrics.subsystems[k] = 0;
        }

        // Instrument Scene_Map.update and SceneManager
        let displayFrames = 0;
        let lastFrameTime = performance.now();
        const origSceneMapUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            displayFrames++;
            const now = performance.now();
            const frameDelta = now - lastFrameTime;
            lastFrameTime = now;
            
            const t0 = performance.now();
            origSceneMapUpdate.call(this);
            const busy = performance.now() - t0;
            
            if (activeRecording) {
                metrics.frameCount++;
                metrics.frameTimes.push(frameDelta);
                metrics.busyTimes.push(busy);
            }
        };

        // Instrument Game_Map.update
        const origGameMapUpdate = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            const t0 = performance.now();
            origGameMapUpdate.call(this, sceneActive);
            const dt = performance.now() - t0;
            if (activeRecording) {
                metrics.tickTimes.push(dt);
                metrics.subsystems.gameMapUpdateMs += dt;
            }
        };

        // Instrument Spriteset_Map.update
        const origSpritesetUpdate = Spriteset_Map.prototype.update;
        Spriteset_Map.prototype.update = function() {
            const t0 = performance.now();
            origSpritesetUpdate.call(this);
            const dt = performance.now() - t0;
            if (activeRecording) metrics.subsystems.spritesetUpdateMs += dt;
        };

        // Instrument Scene_Base.updateChildren (windows / UI)
        const origUpdateChildren = Scene_Base.prototype.updateChildren;
        Scene_Base.prototype.updateChildren = function() {
            const t0 = performance.now();
            origUpdateChildren.call(this);
            const dt = performance.now() - t0;
            if (activeRecording) metrics.subsystems.windowUpdateMs += dt;
        };

        // Instrument UF.World.update
        const origWorldUpdate = W.update;
        W.update = function() {
            const t0 = performance.now();
            origWorldUpdate.call(this);
            const dt = performance.now() - t0;
            if (activeRecording) metrics.subsystems.worldUpdateMs += dt;
        };

        let activeRecording = false;

        async function runBenchmarkSpeed(speedMult, sampleFrames) {
            if (T) T.set(speedMult);
            resetMetrics();
            
            // Warm-up 30 display frames
            const warmupTarget = displayFrames + 30;
            await t.waitUntil(() => displayFrames >= warmupTarget, 10000, "warmup");
            
            resetMetrics();
            const memStart = (performance.memory && performance.memory.usedJSHeapSize) || 0;
            const wallStart = performance.now();
            
            activeRecording = true;
            const sampleTarget = displayFrames + sampleFrames;
            await t.waitUntil(() => displayFrames >= sampleTarget, 25000, "sample frames");
            activeRecording = false;
            
            const wallElapsed = performance.now() - wallStart;
            const memEnd = (performance.memory && performance.memory.usedJSHeapSize) || 0;
            
            const sortedFrames = metrics.frameTimes.slice().sort((a, b) => a - b);
            const sortedBusy = metrics.busyTimes.slice().sort((a, b) => a - b);
            const sortedTicks = metrics.tickTimes.slice().sort((a, b) => a - b);
            
            const p = (arr, q) => arr.length ? arr[Math.floor(arr.length * q)] : 0;
            const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
            
            const ticksCount = metrics.tickTimes.length;
            const achievedTicksPerSec = (ticksCount / (wallElapsed / 1000));
            const achievedSpeedMult = achievedTicksPerSec / 60; // 60 ticks/s is 1x in RMMZ
            
            report.speeds[\`speed_\${speedMult}x\`] = {
                requestedSpeed: speedMult,
                achievedSpeedRatio: parseFloat(achievedSpeedMult.toFixed(2)),
                ticksSimulated: ticksCount,
                wallElapsedMs: parseFloat(wallElapsed.toFixed(2)),
                frameInterval: {
                    avg: parseFloat(avg(sortedFrames).toFixed(2)),
                    median: parseFloat(p(sortedFrames, 0.50).toFixed(2)),
                    p95: parseFloat(p(sortedFrames, 0.95).toFixed(2)),
                    p99: parseFloat(p(sortedFrames, 0.99).toFixed(2)),
                    min: parseFloat((sortedFrames[0] || 0).toFixed(2)),
                    max: parseFloat((sortedFrames[sortedFrames.length - 1] || 0).toFixed(2))
                },
                busyTimePerFrame: {
                    avg: parseFloat(avg(sortedBusy).toFixed(2)),
                    median: parseFloat(p(sortedBusy, 0.50).toFixed(2)),
                    p95: parseFloat(p(sortedBusy, 0.95).toFixed(2)),
                    p99: parseFloat(p(sortedBusy, 0.99).toFixed(2)),
                    max: parseFloat((sortedBusy[sortedBusy.length - 1] || 0).toFixed(2))
                },
                tickExecutionTime: {
                    avg: parseFloat(avg(sortedTicks).toFixed(3)),
                    median: parseFloat(p(sortedTicks, 0.50).toFixed(3)),
                    p95: parseFloat(p(sortedTicks, 0.95).toFixed(3)),
                    p99: parseFloat(p(sortedTicks, 0.99).toFixed(3)),
                    max: parseFloat((sortedTicks[sortedTicks.length - 1] || 0).toFixed(3))
                },
                subsystemMsPerFrame: {
                    windowAndUI: parseFloat((metrics.subsystems.windowUpdateMs / metrics.frameCount).toFixed(2)),
                    spritesetAndRender: parseFloat((metrics.subsystems.spritesetUpdateMs / metrics.frameCount).toFixed(2)),
                    simulationTotal: parseFloat((metrics.subsystems.gameMapUpdateMs / metrics.frameCount).toFixed(2)),
                    worldUnitsMovement: parseFloat((metrics.subsystems.worldUpdateMs / metrics.frameCount).toFixed(2))
                },
                heapUsedDeltaMB: parseFloat(((memEnd - memStart) / (1024 * 1024)).toFixed(2))
            };
        }

        Test.write("Starting 1x Speed Benchmark (120 frames)...");
        await runBenchmarkSpeed(1, 120);

        Test.write("Starting 8x Speed Benchmark (120 frames)...");
        await runBenchmarkSpeed(8, 120);

        Test.write("Starting 32x Speed Benchmark (120 frames)...");
        await runBenchmarkSpeed(32, 120);

        const outReportFile = path.join(baseDir, "test_output", "benchmark_live_report.json");
        fs.writeFileSync(outReportFile, JSON.stringify(report, null, 2));
        Test.write("Benchmark report written to " + outReportFile);

        t.check("benchmark_complete", true, \`Live benchmark completed for 1x, 8x, 32x. Report: \${outReportFile}\`);
    }, { isDefault: false });
`;

// Insert the suite into UF_Test.js right before Test.suite("perf",
testCode = testCode.replace('Test.suite("perf",', `${profilerSuiteCode}\n    Test.suite("perf",`);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running Live Performance Benchmark on native NW.js snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js perf_live --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Benchmark harness failed:', e.stdout || e.message);
    process.exit(1);
}

// Read the generated JSON report
const reportPath = path.join(SNAPSHOT_DIR, 'test_output', 'benchmark_live_report.json');
if (fs.existsSync(reportPath)) {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log('\n==================================================');
    console.log('BASELINE PERFORMANCE MEASUREMENT RESULT (NATIVE NW.JS)');
    console.log('==================================================');
    console.log(JSON.stringify(data, null, 2));
    
    // Also save copy to tools/baseline_perf_report.json for comparison
    fs.writeFileSync(path.join(ROOT, 'tools', 'baseline_perf_report.json'), JSON.stringify(data, null, 2));
} else {
    console.error('Report file missing!');
    process.exit(1);
}

