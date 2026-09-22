//=============================================================================
// UF_Crafting.js - Backward compatibility shim forwarding to DEUS_Crafting.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Crafting.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Crafting")) {
            PluginManager.loadScript("DEUS_Crafting");
        }
    }
})();
