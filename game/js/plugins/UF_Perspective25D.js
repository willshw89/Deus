//=============================================================================
// UF_Perspective25D.js - Backward compatibility shim forwarding to DEUS_Perspective25D.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Perspective25D] 2.5D elevation layers, dynamic Z-depth sorting, real-time directional cast shadows, and canopy occlusion.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Perspective25D")) {
            PluginManager.loadScript("DEUS_Perspective25D");
        }
    }
})();
