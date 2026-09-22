//=============================================================================
// UF_Ecology.js - Backward compatibility shim forwarding to DEUS_Ecology.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Ecology] Environmental regrowth systems: plant spreading, flora regeneration, and sustainable wildlife repopulation.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Ecology")) {
            PluginManager.loadScript("DEUS_Ecology");
        }
    }
})();
