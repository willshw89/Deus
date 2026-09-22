//=============================================================================
// UF_Roads.js - Backward compatibility shim forwarding to DEUS_Roads.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Roads.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Roads")) {
            PluginManager.loadScript("DEUS_Roads");
        }
    }
})();
