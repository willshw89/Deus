//=============================================================================
// UF_Select.js - Backward compatibility shim forwarding to DEUS_Select.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Select.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Select")) {
            PluginManager.loadScript("DEUS_Select");
        }
    }
})();
