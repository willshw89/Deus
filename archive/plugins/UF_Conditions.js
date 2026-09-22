//=============================================================================
// UF_Conditions.js - Backward compatibility shim forwarding to DEUS_Conditions.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Conditions.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Conditions")) {
            PluginManager.loadScript("DEUS_Conditions");
        }
    }
})();
