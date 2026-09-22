//=============================================================================
// UF_Tiles.js - Backward compatibility shim forwarding to DEUS_Tiles.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Tiles] Dynamic terrain autotiling, biome transitions, elevation cliffs, and multi-layer autotile rendering.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Tiles")) {
            PluginManager.loadScript("DEUS_Tiles");
        }
    }
})();
