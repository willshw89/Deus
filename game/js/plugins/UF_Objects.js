//=============================================================================
// UF_Objects.js - Backward compatibility shim forwarding to DEUS_Objects.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Objects] Catalog-driven world objects, multi-state interaction cycles (intact/ruined/harvested), and spatial placement.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Objects")) {
            PluginManager.loadScript("DEUS_Objects");
        }
    }
})();
