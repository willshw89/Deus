//=============================================================================
// tools/health_audit.js
// Automated Diagnostic Suite for DEUS Project Health Baseline
//=============================================================================

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const pluginsDir = path.join(rootDir, "game/js/plugins");
const toolsDir = path.join(rootDir, "tools");

console.log("=================================================================");
console.log("           PROJECT DEUS - ARCHITECTURAL HEALTH AUDIT            ");
console.log("=================================================================\n");

// -----------------------------------------------------------------------------
// 1. Plugin Inventory & Registration Audit
// -----------------------------------------------------------------------------
console.log("[1] Plugin Inventory & Registration");
const pluginFiles = fs.readdirSync(pluginsDir)
    .filter(f => f.startsWith("UF_") && f.endsWith(".js"))
    .map(f => f.replace(".js", ""));

const pluginsJsContent = fs.readFileSync(path.join(rootDir, "game/js/plugins.js"), "utf8");
let registeredPlugins = [];
try {
    const fn = new Function(pluginsJsContent + "; return $plugins;");
    registeredPlugins = fn().map(p => p.name);
} catch (e) {
    console.error("Failed to parse plugins.js:", e.message);
}

const inPluginsJs = new Set(registeredPlugins);
const missingFromJs = pluginFiles.filter(p => !inPluginsJs.has(p));
const missingFromDisk = registeredPlugins.filter(p => !pluginFiles.includes(p));

console.log(`- Plugins on disk: ${pluginFiles.length}`);
console.log(`- Plugins in plugins.js: ${registeredPlugins.length}`);
console.log(`- Missing from plugins.js (loaded dynamically via UF_Core or unlisted):`);
missingFromJs.forEach(p => console.log(`    * ${p}`));
if (missingFromDisk.length) {
    console.log(`- Registered in plugins.js but missing on disk:`);
    missingFromDisk.forEach(p => console.log(`    * ${p}`));
} else {
    console.log(`- All registered plugins exist on disk.`);
}

// -----------------------------------------------------------------------------
// 2. File Size & Line Count Analysis
// -----------------------------------------------------------------------------
console.log("\n[2] Subsystem File Size & Line Counts (Top 15 Largest)");
const pluginStats = pluginFiles.map(name => {
    const fullPath = path.join(pluginsDir, `${name}.js`);
    const stat = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split("\n").length;
    return { name, lines, sizeKB: Math.round(stat.size / 1024 * 10) / 10, content };
});

pluginStats.sort((a, b) => b.lines - a.lines);
pluginStats.slice(0, 15).forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.name.padEnd(24)} ${String(p.lines).padStart(5)} lines  (${p.sizeKB} KB)`);
});

const totalLines = pluginStats.reduce((acc, p) => acc + p.lines, 0);
const totalSizeKB = pluginStats.reduce((acc, p) => acc + p.sizeKB, 0);
console.log(`  TOTAL: ${pluginFiles.length} plugins, ${totalLines.toLocaleString()} lines, ${Math.round(totalSizeKB / 1024 * 10) / 10} MB`);

// -----------------------------------------------------------------------------
// 3. Search for Full-Map / Global Scans in Update Loops
// -----------------------------------------------------------------------------
console.log("\n[3] Full-Map / Global Scans in Update Loops");
const scanPatterns = [
    { name: "Global Units Iteration", pattern: /(?:for\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+.*units|units\.forEach|\.allUnits\(\))/g },
    { name: "Full Objects Scan", pattern: /(?:Objects\(\)\.all|for\s*\(.*256.*256)/g },
    { name: "Full Inventory Scan", pattern: /Items\(\)\.all\(\)/g },
    { name: "Full Jobs Scan in AI", pattern: /Jobs\(\)\.all\(\)/g }
];

pluginStats.forEach(p => {
    // Check if plugin hooks update
    const hasUpdate = /Game_Map\.prototype\.update|Scene_Map\.prototype\.update|prototype\.update\s*=/.test(p.content);
    if (hasUpdate) {
        scanPatterns.forEach(sp => {
            const matches = (p.content.match(sp.pattern) || []).length;
            if (matches > 0) {
                console.log(`  [POTENTIAL HOT LOOP] ${p.name}: ${matches}x ${sp.name}`);
            }
        });
    }
});

// -----------------------------------------------------------------------------
// 4. Timer & Clock Ambiguity Audit
// -----------------------------------------------------------------------------
console.log("\n[4] Timer & Clock Usage Audit");
let nakedSetTimeout = 0;
let nakedSetInterval = 0;
const timerUsage = [];

pluginStats.forEach(p => {
    const stMatches = (p.content.match(/setTimeout\s*\(/g) || []).length;
    const siMatches = (p.content.match(/setInterval\s*\(/g) || []).length;
    const legacyTimeAfter = (p.content.match(/Time\.after\s*\(\s*\d+/g) || []).length;
    const domainTagged = (p.content.match(/domain:\s*["'](?:action|historical|presentation|engine)["']/g) || []).length;
    
    if (stMatches || siMatches || legacyTimeAfter || domainTagged) {
        timerUsage.push({ name: p.name, setTimeout: stMatches, setInterval: siMatches, legacyTimeAfter, domainTagged });
    }
    nakedSetTimeout += stMatches;
    nakedSetInterval += siMatches;
});

console.log(`- Native setTimeout occurrences: ${nakedSetTimeout}`);
console.log(`- Native setInterval occurrences: ${nakedSetInterval}`);
timerUsage.forEach(tu => {
    console.log(`  * ${tu.name.padEnd(20)} setTimeout: ${tu.setTimeout}, setInterval: ${tu.setInterval}, legacyTimeAfter: ${tu.legacyTimeAfter}, domainTagged: ${tu.domainTagged}`);
});

// -----------------------------------------------------------------------------
// 5. Duplicated Logic Audit
// -----------------------------------------------------------------------------
console.log("\n[5] Known Duplicated Logic & Cross-Subsystem Overlap");
const duplicatedConcepts = [
    { concept: "Material Lookup", pattern: /(?:catalog\(\)\.materials|catalog\.materials|\$ufWorldCatalog\.materials)/g },
    { concept: "Skills / Stats Access", pattern: /(?:\.data\.skills|\.data\.skillXp|\.data\.proficiencyXp)/g },
    { concept: "Container Resolution", pattern: /(?:Containers\(\)|UF\.Containers)/g },
    { concept: "Distance / Grid Measurement", pattern: /(?:cheb|manhattan|Math\.hypot|Math\.sqrt.*dx.*dy)/g },
    { concept: "Z-level Check (sameZ)", pattern: /(?:sameZ|zOf|\.area\.z ===)/g }
];

duplicatedConcepts.forEach(dc => {
    const occurrences = [];
    pluginStats.forEach(p => {
        const count = (p.content.match(dc.pattern) || []).length;
        if (count > 0) occurrences.push({ plugin: p.name, count });
    });
    console.log(`- ${dc.concept}: found in ${occurrences.length} plugins`);
    if (occurrences.length > 5) {
        console.log(`  (Top: ${occurrences.sort((a, b) => b.count - a.count).slice(0, 4).map(o => `${o.plugin} [${o.count}]`).join(", ")})`);
    }
});

// -----------------------------------------------------------------------------
// 6. Save Schema & Serialization Audit
// -----------------------------------------------------------------------------
console.log("\n[6] Save Schema & Serialization");
const saveHooks = [];
pluginStats.forEach(p => {
    const hasSave = /DataManager\.makeSaveContents|makeSaveContents|extractSaveContents/.test(p.content);
    const hasVersion = /saveSchemaVersion|schemaVersion|version:\s*\d+/.test(p.content);
    if (hasSave || hasVersion) {
        saveHooks.push({ name: p.name, hasSave, hasVersion });
    }
});
console.log(`- Plugins with explicit save hooks/data extraction: ${saveHooks.length}`);
saveHooks.forEach(sh => {
    console.log(`  * ${sh.name.padEnd(20)} SaveHook: ${sh.hasSave}, SchemaVersion: ${sh.hasVersion}`);
});

// -----------------------------------------------------------------------------
// 7. TODO / FIXME / Abandoned Systems Audit
// -----------------------------------------------------------------------------
console.log("\n[7] Code Comments Audit (TODO / FIXME / RETIRED)");
let todoCount = 0;
let fixmeCount = 0;
pluginStats.forEach(p => {
    const todos = (p.content.match(/\/\/\s*TODO\b|\/\*\s*TODO\b/gi) || []).length;
    const fixmes = (p.content.match(/\/\/\s*FIXME\b|\/\*\s*FIXME\b/gi) || []).length;
    if (todos > 0 || fixmes > 0) {
        console.log(`  * ${p.name.padEnd(20)} TODOs: ${todos}, FIXMEs: ${fixmes}`);
        todoCount += todos;
        fixmeCount += fixmes;
    }
});
console.log(`- Total TODOs: ${todoCount}, Total FIXMEs: ${fixmeCount}`);

// -----------------------------------------------------------------------------
// 8. Automated Test Suite Inventory & Execution
// -----------------------------------------------------------------------------
console.log("\n[8] Automated Test Suite Execution");
const testFiles = fs.readdirSync(toolsDir)
    .filter(f => (f.startsWith("test_") || f.includes("test")) && f.endsWith(".js") && !f.includes("clean"));

console.log(`- Found ${testFiles.length} test scripts in tools/`);

const testResults = [];
testFiles.forEach(tf => {
    const testPath = path.join(toolsDir, tf);
    try {
        const start = Date.now();
        const out = execSync(`node "${testPath}"`, { cwd: rootDir, encoding: "utf8", timeout: 15000 });
        const dur = Date.now() - start;
        const passMatches = (out.match(/PASS/g) || []).length;
        const failMatches = (out.match(/FAIL/g) || []).length;
        testResults.push({ file: tf, ok: true, dur, pass: passMatches, fail: failMatches });
        console.log(`  [PASS] ${tf.padEnd(35)} (${dur}ms, ${passMatches} passes, ${failMatches} fails)`);
    } catch (err) {
        const out = err.stdout ? err.stdout.toString() : err.message;
        const passMatches = (out.match(/PASS/g) || []).length;
        const failMatches = (out.match(/FAIL/g) || []).length;
        testResults.push({ file: tf, ok: false, err: err.message, pass: passMatches, fail: failMatches });
        console.log(`  [FAIL] ${tf.padEnd(35)} (Exit non-zero / failed)`);
    }
});

console.log("\n=================================================================");
console.log("                      AUDIT COMPLETE                             ");
console.log("=================================================================");

