//=============================================================================
// UF_Walls.js - Backward compatibility shim forwarding to DEUS_Walls.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Walls] Structural 2-tile wall systems with black wall-top occlusion convention, material durability, and construction.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Walls")) {
            PluginManager.loadScript("DEUS_Walls");
        }
    }
})();
