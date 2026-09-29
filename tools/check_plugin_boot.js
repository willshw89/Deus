#!/usr/bin/env node
'use strict';

//=============================================================================
// check_plugin_boot.js - Plugin Boot & Companion Health Verification
// Project DEUS - NAT.04.01 (lane-cf)
// Authority: DEC-041, BRIEF lane-cf
//
// Reads game/js/plugins.js and the latest launch in game/game_runtime.log.
// Fails if:
// 1. Any registered active plugin in plugins.js is missing on disk.
// 2. Any '[CORE] Companion plugin ... NOT loaded' line appears in the latest launch.
// 3. Any plugin loads twice (e.g. both require() and loadScript()).
//=============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLUGINS_JS = path.join(ROOT, 'game', 'js', 'plugins.js');
const PLUGINS_DIR = path.join(ROOT, 'game', 'js', 'plugins');
const RUNTIME_LOG = path.join(ROOT, 'game', 'game_runtime.log');

let passed = 0;
let failed = 0;

function check(desc, cond, extra = '') {
    if (cond) {
        console.log(`PASS: ${desc} ${extra}`);
        passed++;
    } else {
        console.error(`FAIL: ${desc} ${extra}`);
        failed++;
    }
}

function parsePluginsJs(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`plugins.js not found at ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const match = /var\s+\$plugins\s*=\s*(\[[\s\S]*?\]);/m.exec(content);
    if (!match) {
        throw new Error(`Could not parse $plugins array from ${filePath}`);
    }
    return JSON.parse(match[1]);
}

function readLogTail(logPath, maxBytes = 1024 * 1024) {
    if (!fs.existsSync(logPath)) return '';
    const stats = fs.statSync(logPath);
    const size = stats.size;
    if (size === 0) return '';

    const bytesToRead = Math.min(size, maxBytes);
    const buffer = Buffer.alloc(bytesToRead);
    const fd = fs.openSync(logPath, 'r');
    fs.readSync(fd, buffer, 0, bytesToRead, size - bytesToRead);
    fs.closeSync(fd);
    return buffer.toString('utf8');
}

function runChecks(options = {}) {
    passed = 0;
    failed = 0;

    console.log('=== Checking Registered Plugins on Disk ===');
    const plugins = options.mockPlugins || parsePluginsJs(options.pluginsJs || PLUGINS_JS);
    const activePlugins = plugins.filter(p => p.status === true);
    console.log(`Found ${activePlugins.length} active plugins in plugins.js.`);

    for (const p of activePlugins) {
        const scriptPath = path.join(options.pluginsDir || PLUGINS_DIR, `${p.name}.js`);
        const exists = fs.existsSync(scriptPath);
        check(`Plugin file exists: ${p.name}.js`, exists, exists ? '' : `(Missing at ${scriptPath})`);
    }

    console.log('\n=== Checking Game Runtime Log for Boot Errors ===');
    const logText = options.mockLog !== undefined ? options.mockLog : readLogTail(options.runtimeLog || RUNTIME_LOG);

    if (!logText) {
        console.log('NOTE: game_runtime.log is empty or not yet generated in this worktree.');
    } else {
        // Find latest session boot marker
        const bootMarkers = [
            'Scene_Boot.start called',
            '=== Game Boot',
            'UF_Test run'
        ];
        let lastBootIndex = -1;
        for (const marker of bootMarkers) {
            const idx = logText.lastIndexOf(marker);
            if (idx > lastBootIndex) lastBootIndex = idx;
        }

        const sessionLog = lastBootIndex >= 0 ? logText.slice(lastBootIndex) : logText;

        // Check for companion not loaded
        const companionFailMatch = /\[CORE\]\s+Companion plugin\s+([A-Za-z0-9_]+)\s+NOT loaded/i.exec(sessionLog);
        check(
            'No companion plugin load failures',
            !companionFailMatch,
            companionFailMatch ? `(Failed companion: ${companionFailMatch[1]})` : ''
        );

        // Check for duplicate plugin loads
        const loadedScripts = new Map();
        const loadLines = sessionLog.match(/Loaded plugin:\s+([A-Za-z0-9_]+)/gi) || [];
        let duplicateFound = null;
        for (const l of loadLines) {
            const m = /Loaded plugin:\s+([A-Za-z0-9_]+)/i.exec(l);
            if (m) {
                const name = m[1];
                const count = (loadedScripts.get(name) || 0) + 1;
                loadedScripts.set(name, count);
                if (count > 1) duplicateFound = name;
            }
        }
        check('No duplicate plugin load detected', !duplicateFound, duplicateFound ? `(Duplicate: ${duplicateFound})` : '');
    }

    console.log(`\nPlugin Boot Health Summary: ${passed} passed, ${failed} failed`);
    return failed === 0;
}

if (require.main === module) {
    const isSelfTest = process.argv.includes('--self-test');
    if (isSelfTest) {
        console.log('Running self-test with negative controls...');
        // Test 1: missing plugin
        const missingRes = runChecks({
            mockPlugins: [{ name: 'DEUS_NonExistentPlugin_XYZ', status: true }],
            mockLog: ''
        });
        if (missingRes) {
            console.error('Self-test FAIL: missing plugin did not fail');
            process.exit(1);
        }

        // Test 2: companion not loaded
        const companionRes = runChecks({
            mockPlugins: [],
            mockLog: '[CORE] Companion plugin DEUS_Bag NOT loaded (Cannot find module)'
        });
        if (companionRes) {
            console.error('Self-test FAIL: companion not loaded did not fail');
            process.exit(1);
        }
        console.log('Self-test PASSED (all negative controls caught).');
        process.exit(0);
    }

    const ok = runChecks();
    process.exit(ok ? 0 : 1);
}

module.exports = { runChecks, parsePluginsJs, readLogTail };
