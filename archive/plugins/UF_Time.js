//=============================================================================
// UF_Time.js - Backward compatibility shim forwarding to DEUS_Time.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Time.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Time")) {
            PluginManager.loadScript("DEUS_Time");
        }
    }
})();
