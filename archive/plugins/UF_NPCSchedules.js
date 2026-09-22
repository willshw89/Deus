//=============================================================================
// UF_NPCSchedules.js - Backward compatibility shim forwarding to DEUS_NPCSchedules.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_NPCSchedules.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_NPCSchedules")) {
            PluginManager.loadScript("DEUS_NPCSchedules");
        }
    }
})();
