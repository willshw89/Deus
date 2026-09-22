//=============================================================================
// UF_Households.js - Backward compatibility shim forwarding to DEUS_Households.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Households.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Households")) {
            PluginManager.loadScript("DEUS_Households");
        }
    }
})();
