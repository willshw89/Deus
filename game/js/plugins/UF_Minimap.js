//=============================================================================
// UF_Minimap.js - Backward compatibility shim forwarding to DEUS_Minimap.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Minimap] Strategic overview minimap reflecting character knowledge/discovery across all 5 Z-levels (-2 to +2).
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Minimap")) {
            PluginManager.loadScript("DEUS_Minimap");
        }
    }
})();
