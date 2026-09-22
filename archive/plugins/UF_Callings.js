//=============================================================================
// UF_Callings.js - Backward compatibility shim forwarding to DEUS_Callings.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Callings.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Callings")) {
            PluginManager.loadScript("DEUS_Callings");
        }
    }
})();
