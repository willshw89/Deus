//=============================================================================
// UF_ProfileTabs.js - Backward compatibility shim forwarding to DEUS_ProfileTabs.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_ProfileTabs.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_ProfileTabs")) {
            PluginManager.loadScript("DEUS_ProfileTabs");
        }
    }
})();
