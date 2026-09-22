//=============================================================================
// UF_FireSafety.js - Backward compatibility shim forwarding to DEUS_FireSafety.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_FireSafety.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_FireSafety")) {
            PluginManager.loadScript("DEUS_FireSafety");
        }
    }
})();
