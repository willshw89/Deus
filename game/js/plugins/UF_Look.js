//=============================================================================
// UF_Look.js - Backward compatibility shim forwarding to DEUS_Look.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Look] Cursor inspection tooltip: cell terrain, biome properties, occupants, objects, and asset provenance.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Look")) {
            PluginManager.loadScript("DEUS_Look");
        }
    }
})();
