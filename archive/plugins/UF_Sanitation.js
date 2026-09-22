//=============================================================================
// UF_Sanitation.js - Backward compatibility shim forwarding to DEUS_Sanitation.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Sanitation.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Sanitation")) {
            PluginManager.loadScript("DEUS_Sanitation");
        }
    }
})();
