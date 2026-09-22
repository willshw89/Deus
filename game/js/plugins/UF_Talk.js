//=============================================================================
// UF_Talk.js - Backward compatibility shim forwarding to DEUS_Talk.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Talk] Modal conversation interface: faction portraits, branching dialogue keywords, and lore exchange.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Talk")) {
            PluginManager.loadScript("DEUS_Talk");
        }
    }
})();
