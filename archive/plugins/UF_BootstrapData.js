//=============================================================================
// UF_BootstrapData.js - Backward compatibility shim forwarding to DEUS_BootstrapData.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_BootstrapData.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_BootstrapData")) {
            PluginManager.loadScript("DEUS_BootstrapData");
        }
    }
})();
