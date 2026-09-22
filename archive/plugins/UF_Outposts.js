//=============================================================================
// UF_Outposts.js - Backward compatibility shim forwarding to DEUS_Outposts.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Outposts.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Outposts")) {
            PluginManager.loadScript("DEUS_Outposts");
        }
    }
})();
