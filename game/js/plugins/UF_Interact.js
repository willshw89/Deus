//=============================================================================
// UF_Interact.js - Backward compatibility shim forwarding to DEUS_Interact.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Interact] Contextual right-click interaction menu, order designation markers, and immediate job creation.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Interact")) {
            PluginManager.loadScript("DEUS_Interact");
        }
    }
})();
