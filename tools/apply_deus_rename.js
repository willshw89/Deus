"use strict";
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const pluginsDir = path.join(rootDir, "game", "js", "plugins");
const backupDir = path.join(rootDir, "archive", "plugins_uf_pre_rename");
const pluginsJsPath = path.join(rootDir, "game", "js", "plugins.js");

console.log("Starting Project DEUS reference renaming pipeline...");

// 1. Ensure backup directory exists
fs.mkdirSync(backupDir, { recursive: true });

// 2. Read game/js/plugins.js
let pluginsJs = fs.readFileSync(pluginsJsPath, "utf8");

// Get all UF_*.js plugin files in game/js/plugins
const currentUfFiles = fs.readdirSync(pluginsDir).filter(f => f.startsWith("UF_") && f.endsWith(".js"));

// Backup original UF files if not already backed up
for (const f of currentUfFiles) {
    const srcPath = path.join(pluginsDir, f);
    const destPath = path.join(backupDir, f);
    const text = fs.readFileSync(srcPath, "utf8");
    if (!text.includes("Backward compatibility shim")) {
        fs.writeFileSync(destPath, text, "utf8");
    }
}
console.log(`Verified pre-rename backup in ${backupDir}`);

// Get list of plugins to transform from backup directory
const sourceFiles = fs.readdirSync(backupDir).filter(f => f.startsWith("UF_") && f.endsWith(".js"));
console.log(`Processing ${sourceFiles.length} plugin sources from backup`);

const renamedMap = new Map();
for (const file of sourceFiles) {
    const baseName = file.replace(/\.js$/, "");
    const subName = baseName.replace(/^UF_/, "");
    const newBaseName = "DEUS_" + subName;
    renamedMap.set(baseName, newBaseName);
}

// 3. Transform and write DEUS_*.js
for (const [oldBase, newBase] of renamedMap.entries()) {
    const srcFilePath = path.join(backupDir, oldBase + ".js");
    const newFilePath = path.join(pluginsDir, newBase + ".js");
    let content = fs.readFileSync(srcFilePath, "utf8");

    // Replace header comments
    content = content.replace(new RegExp(`//\\s*${oldBase}\\.js`, "g"), `// ${newBase}.js`);
    content = content.replace(/@plugindesc\s+\[UF\s+/g, "@plugindesc [DEUS ");
    content = content.replace(/@base\s+UF_/g, "@base DEUS_");
    content = content.replace(/@orderAfter\s+UF_/g, "@orderAfter DEUS_");
    content = content.replace(/@orderBefore\s+UF_/g, "@orderBefore DEUS_");

    // Replace pluginName constant if exact match
    content = content.replace(new RegExp(`const\\s+pluginName\\s*=\\s*"${oldBase}"`, "g"), `const pluginName = "${newBase}"`);
    content = content.replace(new RegExp(`const\\s+PLUGIN\\s*=\\s*"${oldBase}"`, "g"), `const PLUGIN = "${newBase}"`);

    // Replace PluginManager.parameters calls to fallback to old if not found
    content = content.replace(new RegExp(`PluginManager\\.parameters\\("${oldBase}"\\)`, "g"),
        `(PluginManager.parameters("${newBase}") && Object.keys(PluginManager.parameters("${newBase}")).length ? PluginManager.parameters("${newBase}") : PluginManager.parameters("${oldBase}"))`);

    // Dual namespace: window.DEUS and window.UF = window.DEUS
    content = content.replace(/window\.UF\s*=\s*window\.UF\s*\|\|\s*\{\};/g,
        `window.DEUS = window.DEUS || {};\n    window.UF = window.DEUS;`);

    // Special customization for DEUS_Core.js
    if (oldBase === "UF_Core") {
        content = content.replace(`window.$ufTime = new Game_UFTime();`,
            `window.Game_DEUSTime = Game_UFTime;\n    window.$deusTime = new Game_UFTime();\n    window.$ufTime = window.$deusTime;`);
        content = content.replace(/contents\.ufTime\s*=\s*\{/g,
            `contents.deusTime = {\n            hour: $ufTime.hour,\n            minute: $ufTime.minute,\n            day: $ufTime.day,\n            monthIndex: $ufTime.monthIndex,\n            year: $ufTime.year,\n            showHUD: $ufTime.showHUD\n        };\n        contents.ufTime = contents.deusTime;\n        if (false) contents.ufTime = {`);
        content = content.replace(/if\s*\(contents\.ufTime\)\s*\{/g,
            `const _tData = contents.deusTime || contents.ufTime;\n        if (_tData) {\n            $ufTime.hour = _tData.hour;\n            $ufTime.minute = _tData.minute;\n            $ufTime.day = _tData.day;\n            $ufTime.monthIndex = _tData.monthIndex;\n            $ufTime.year = _tData.year;\n            $ufTime.showHUD = _tData.showHUD;\n        }\n        if (false && contents.ufTime) {`);
        content = content.replace(/!PluginManager\._scripts\.includes\("UF_Environment"\)/g,
            `!PluginManager._scripts.includes("DEUS_Environment") && !PluginManager._scripts.includes("UF_Environment")`);
        content = content.replace(/PluginManager\.loadScript\("UF_Environment"\);/g,
            `PluginManager.loadScript("DEUS_Environment");`);
        content = content.replace(/PluginManager\._scripts\.push\("UF_Environment"\);/g,
            `PluginManager._scripts.push("DEUS_Environment");`);

        for (const sub of ["Containers", "Resources", "Proficiency", "Conditions", "Rules", "Time"]) {
            content = content.replace(new RegExp(`!PluginManager\\._scripts\\.includes\\("UF_${sub}"\\)`, "g"),
                `!PluginManager._scripts.includes("DEUS_${sub}") && !PluginManager._scripts.includes("UF_${sub}")`);
            content = content.replace(new RegExp(`PluginManager\\.loadScript\\("UF_${sub}"\\);`, "g"),
                `PluginManager.loadScript("DEUS_${sub}");`);
            content = content.replace(new RegExp(`PluginManager\\._scripts\\.push\\("UF_${sub}"\\);`, "g"),
                `PluginManager._scripts.push("DEUS_${sub}");`);
        }
    }

    // Special customization for DEUS_BootstrapData.js
    if (oldBase === "UF_BootstrapData") {
        content = content.replace(`window.$ufContainers = window.$ufContainers || {};`,
            `window.$deusContainers = window.$deusContainers || {};\n    window.$ufContainers = window.$deusContainers;`);
    }

    // Special customization for DEUS_WorldGen.js
    if (oldBase === "UF_WorldGen") {
        content = content.replace(`const CATALOG_VAR = "$ufWorldCatalog";`,
            `const CATALOG_VAR = "$deusWorldCatalog";`);
        content = content.replace(`DataManager._databaseFiles.push({ name: CATALOG_VAR, src: "UF_WorldCatalog.json" });`,
            `DataManager._databaseFiles.push({ name: CATALOG_VAR, src: "DEUS_WorldCatalog.json" });\n        window.$ufWorldCatalog = window.$deusWorldCatalog;`);
        content = content.replace(`const catalog = () => window[CATALOG_VAR] || null;`,
            `const catalog = () => {\n        const cat = window.$deusWorldCatalog || window.$ufWorldCatalog || null;\n        if (cat) { window.$deusWorldCatalog = cat; window.$ufWorldCatalog = cat; }\n        return cat;\n    };`);
    }

    // Special customization for DEUS_Test.js
    if (oldBase === "UF_Test") {
        content = content.replace(
            `const flag = args.find(a => a === "--uf-test" || a.startsWith("--uf-test="));`,
            `const flag = args.find(a => a === "--deus-test" || a.startsWith("--deus-test=") || a === "--uf-test" || a.startsWith("--uf-test="));`
        );
        content = content.replace(
            `window.UF.Test = Test;`,
            `window.DEUS.Test = Test;\n    window.UF.Test = Test;`
        );
    }

    fs.writeFileSync(newFilePath, content, "utf8");
}
console.log(`Successfully generated ${renamedMap.size} DEUS_*.js plugins.`);

// 4. Update game/js/plugins.js
for (const [oldBase, newBase] of renamedMap.entries()) {
    pluginsJs = pluginsJs.replace(new RegExp(`"name"\\s*:\\s*"${oldBase}"`, "g"), `"name":"${newBase}"`);
}
fs.writeFileSync(pluginsJsPath, pluginsJs, "utf8");
console.log("Updated game/js/plugins.js with DEUS_* names.");

// 5. Update tools/run_tests.js
const runTestsPath = path.join(rootDir, "tools", "run_tests.js");
let runTestsContent = fs.readFileSync(runTestsPath, "utf8");
runTestsContent = runTestsContent.replace(
    `if (!/"name"\\s*:\\s*"UF_Test"\\s*,\\s*"status"\\s*:\\s*true/.test(pluginsJs)) {`,
    `if (!/"name"\\s*:\\s*"(?:DEUS_Test|UF_Test)"\\s*,\\s*"status"\\s*:\\s*true/.test(pluginsJs)) {`
);
runTestsContent = runTestsContent.replace(
    `const flag = suite ? \`--uf-test=\${suite}\` : "--uf-test";`,
    `const flag = suite ? \`--deus-test=\${suite}\` : "--deus-test";`
);
fs.writeFileSync(runTestsPath, runTestsContent, "utf8");
console.log("Updated tools/run_tests.js for DEUS_Test and --deus-test.");

// 6. Create backward compatibility forwarder stubs in UF_*.js
for (const [oldBase, newBase] of renamedMap.entries()) {
    const oldFilePath = path.join(pluginsDir, oldBase + ".js");
    const shimContent = `//=============================================================================
// ${oldBase}.js - Backward compatibility shim forwarding to ${newBase}.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to ${newBase}.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("${newBase}")) {
            PluginManager.loadScript("${newBase}");
        }
    }
})();
`;
    fs.writeFileSync(oldFilePath, shimContent, "utf8");
}
console.log("Created backward compatibility shims in UF_*.js");
console.log("Pipeline completed successfully!");

