//=============================================================================
// UF_Proficiency.js - Backward compatibility shim forwarding to DEUS_Proficiency.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Proficiency.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Proficiency")) {
            PluginManager.loadScript("DEUS_Proficiency");
        }
    }
})();
