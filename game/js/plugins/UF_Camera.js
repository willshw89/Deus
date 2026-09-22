//=============================================================================
// UF_Camera.js - Backward compatibility shim forwarding to DEUS_Camera.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Camera] Pixel-exact camera zoom controls, smooth panning navigation, and entity target tracking.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Camera")) {
            PluginManager.loadScript("DEUS_Camera");
        }
    }
})();
