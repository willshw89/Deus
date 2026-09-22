//=============================================================================
// UF_WorldGen.js - Backward compatibility shim forwarding to DEUS_WorldGen.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS WorldGen] Multi-octave Perlin terrain synthesis, elevation and moisture maps, geological strata, and biome placement.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_WorldGen")) {
            PluginManager.loadScript("DEUS_WorldGen");
        }
    }
})();
