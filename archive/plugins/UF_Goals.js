//=============================================================================
// UF_Goals.js - Backward compatibility shim forwarding to DEUS_Goals.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Goals.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Goals")) {
            PluginManager.loadScript("DEUS_Goals");
        }
    }
})();
