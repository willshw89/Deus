#!/usr/bin/env node
'use strict';

/**
 * tools/diagnose_hotspots.js
 *
 * Precise subsystem instrumentation for all Game_Map.update hooks in Project DEUS.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'perf_diag');

try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// Copy game/ to snapshot
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// Target plugins that alias Game_Map.prototype.update
const targetPlugins = [
    'UF_World.js',
    'UF_Jobs.js',
    'UF_Colonists.js',
    'UF_Wildlife.js',
    'UF_Ecology.js',
    'UF_Environment.js',
    'UF_Anim.js',
    'UF_Combat.js',
    'UF_TimeSpeed.js',
    'UF_Ownership.js',
    'UF_Fire.js',
    'UF_Fog.js'
];

for (const p of targetPlugins) {
    const filePath = path.join(SNAPSHOT_DIR, 'js', 'plugins', p);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    const name = p.replace('.js', '');

    // Replace the Game_Map.prototype.update alias with an instrumented wrapper
    const target = 'Game_Map.prototype.update = function(sceneActive) {';
    if (content.includes(target)) {
        const replacement = `
    Game_Map.prototype.update = function(sceneActive) {
        window.__subTimings = window.__subTimings || {};
        window.__subMax = window.__subMax || {};
        const _t0_${name} = performance.now();
        try {`;
        
        // And append the timer at the end of the function before the closing };
        // We do this by searching for the function body
        content = content.replace(target, replacement);
        // Find the next }; at same indentation level or wrap the inner logic
        // Actually, simpler and 100% robust: wrap the call inside:
        // const _orig_${name} = Game_Map.prototype.update;
    }
}

// Even cleaner: Hook Game_Map.prototype.update dynamically right after each plugin loads!
// In UF_Test.js, we can define a proxy or we can instrument the plugins directly.
// Let's directly instrument each plugin by prepending/appending a timing variable around its body.
for (const p of targetPlugins) {
    const filePath = path.join(SNAPSHOT_DIR, 'js', 'plugins', p);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    const name = p.replace('.js', '');

    const pattern = /Game_Map\.prototype\.update\s*=\s*function\s*\(\s*sceneActive\s*\)\s*\{/;
    if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
            return `const _orig_fn_${name} = ` + match.replace('Game_Map.prototype.update = ', '') + `\n` +
            `Game_Map.prototype.update = function(sceneActive) {\n` +
            `    window.__subTimings = window.__subTimings || {};\n` +
            `    window.__subMax = window.__subMax || {};\n` +
            `    const _t0 = performance.now();\n` +
            `    _orig_fn_${name}.call(this, sceneActive);\n` +
            `    const _dt = performance.now() - _t0;\n` +
            `    window.__subTimings['${name}'] = (window.__subTimings['${name}'] || 0) + _dt;\n` +
            `    if (_dt > (window.__subMax['${name}'] || 0)) window.__subMax['${name}'] = _dt;\n` +
            `};\n` +
            `function _dummy_unused_${name}() {`;
        });
        // Close the dummy function at the matching end
        content = content.replace(/_orig_fn_.*?\n\s*};\n/s, (m) => m); // keep
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

// Inject diagnostic suite into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const probeCode = `
    Test.suite("diag", async t => {
        window.__subTimings = {};
        window.__subMax = {};
        const longFrames = [];

        let lastFrameEnd = performance.now();
        const origUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const now = performance.now();
            const frameMs = now - lastFrameEnd;
            lastFrameEnd = now;
            if (frameMs > 30) {
                longFrames.push(parseFloat(frameMs.toFixed(1)));
            }
            return origUpdate.call(this);
        };

        console.log("Sampling 600 frames (~10 seconds) on map...");
        await t.waitFrames(600);

        Test.write("=== SUBSYSTEM EXECUTION BREAKDOWN (600 frames) ===");
        const sorted = Object.keys(window.__subTimings).sort((a, b) => window.__subTimings[b] - window.__subTimings[a]);
        for (const k of sorted) {
            const tot = window.__subTimings[k];
            const mx = window.__subMax[k] || 0;
            Test.write(\`\${k}: total=\${tot.toFixed(1)}ms, avg=\${(tot / 600).toFixed(3)}ms/frame, max=\${mx.toFixed(1)}ms\`);
        }
        Test.write(\`Long frames (>30ms): \${longFrames.length} frames, worst: \${longFrames.length ? Math.max(...longFrames) : 0} ms\`);
        Test.write(\`First 10 long frames: \${longFrames.slice(0, 10).join(", ")} ms\`);

        const diagFile = path.join(baseDir, "test_output", "hotspots.json");
        fs.writeFileSync(diagFile, JSON.stringify({ timings: window.__subTimings, max: window.__subMax, longFrames }, null, 2));

        t.check("diag_completed", true, \`Long frames count: \${longFrames.length}\`);
    }, { isDefault: false });
`;

testCode = testCode.replace('Test.suite("perf",', `${probeCode}\n    Test.suite("perf",`);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running hotspot diagnostic on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js diag --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Diagnostic harness failed:', e.stdout || e.message);
    process.exit(1);
}

