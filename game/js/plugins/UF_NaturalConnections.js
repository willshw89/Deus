//=============================================================================
// UF_NaturalConnections.js - Backward compatibility shim forwarding to DEUS_NaturalConnections.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS NaturalConnections] Natural cavern passages, vertical stairwells, and physical traversal between surface and underground.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_NaturalConnections")) {
            PluginManager.loadScript("DEUS_NaturalConnections");
        }
    }
})();
