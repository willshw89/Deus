//=============================================================================
// UF_FarmView.js - Backward compatibility shim forwarding to DEUS_FarmView.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_FarmView.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_FarmView")) {
            PluginManager.loadScript("DEUS_FarmView");
        }
    }
})();
