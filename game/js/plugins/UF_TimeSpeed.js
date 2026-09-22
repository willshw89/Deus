//=============================================================================
// UF_TimeSpeed.js - Backward compatibility shim forwarding to DEUS_TimeSpeed.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS TimeSpeed] Simulation speed controller (1x, 2x, 4x, 8x, 16x, 32x), active world pause, and game-time scheduling.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_TimeSpeed")) {
            PluginManager.loadScript("DEUS_TimeSpeed");
        }
    }
})();
