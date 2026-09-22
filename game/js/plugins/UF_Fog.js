//=============================================================================
// UF_Fog.js - Backward compatibility shim forwarding to DEUS_Fog.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Fog] Fog of war occlusion, line-of-sight revelation, faction vision sharing, and persistent exploration memory.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Fog")) {
            PluginManager.loadScript("DEUS_Fog");
        }
    }
})();
