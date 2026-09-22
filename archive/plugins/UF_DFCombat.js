//=============================================================================
// UF_DFCombat.js - Backward compatibility shim forwarding to DEUS_DFCombat.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_DFCombat.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_DFCombat")) {
            PluginManager.loadScript("DEUS_DFCombat");
        }
    }
})();
