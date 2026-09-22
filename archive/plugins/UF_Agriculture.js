//=============================================================================
// UF_Agriculture.js - Backward compatibility shim forwarding to DEUS_Agriculture.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Agriculture.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Agriculture")) {
            PluginManager.loadScript("DEUS_Agriculture");
        }
    }
})();
