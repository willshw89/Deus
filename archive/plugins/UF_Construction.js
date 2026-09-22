//=============================================================================
// UF_Construction.js - Backward compatibility shim forwarding to DEUS_Construction.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Construction.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Construction")) {
            PluginManager.loadScript("DEUS_Construction");
        }
    }
})();
