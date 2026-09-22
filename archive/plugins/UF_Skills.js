//=============================================================================
// UF_Skills.js - Backward compatibility shim forwarding to DEUS_Skills.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Skills.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Skills")) {
            PluginManager.loadScript("DEUS_Skills");
        }
    }
})();
