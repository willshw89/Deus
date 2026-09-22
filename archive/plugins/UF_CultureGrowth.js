//=============================================================================
// UF_CultureGrowth.js - Backward compatibility shim forwarding to DEUS_CultureGrowth.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_CultureGrowth.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_CultureGrowth")) {
            PluginManager.loadScript("DEUS_CultureGrowth");
        }
    }
})();
