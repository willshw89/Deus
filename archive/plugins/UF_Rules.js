//=============================================================================
// UF_Rules.js - Backward compatibility shim forwarding to DEUS_Rules.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Rules.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Rules")) {
            PluginManager.loadScript("DEUS_Rules");
        }
    }
})();
