//=============================================================================
// UF_Gumps.js - Backward compatibility shim forwarding to DEUS_Gumps.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Gumps.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Gumps")) {
            PluginManager.loadScript("DEUS_Gumps");
        }
    }
})();
