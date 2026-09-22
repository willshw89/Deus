//=============================================================================
// UF_DFWorld.js - Backward compatibility shim forwarding to DEUS_DFWorld.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_DFWorld.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_DFWorld")) {
            PluginManager.loadScript("DEUS_DFWorld");
        }
    }
})();
