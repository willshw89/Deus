//=============================================================================
// UF_Visuals.js - Backward compatibility shim forwarding to DEUS_Visuals.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Visuals] Visual pipeline: high-DPI scaling, viewport rendering, 2.5D projection, and pixel-crisp display.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Visuals")) {
            PluginManager.loadScript("DEUS_Visuals");
        }
    }
})();
