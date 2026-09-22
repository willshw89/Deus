//=============================================================================
// UF_Containers.js - Backward compatibility shim forwarding to DEUS_Containers.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Containers.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Containers")) {
            PluginManager.loadScript("DEUS_Containers");
        }
    }
})();
