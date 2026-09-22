//=============================================================================
// UF_Test.js - Backward compatibility shim forwarding to DEUS_Test.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Test] Automated test harness: PASS/FAIL test suites, screenshot verification, and performance benchmarks.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Test")) {
            PluginManager.loadScript("DEUS_Test");
        }
    }
})();
