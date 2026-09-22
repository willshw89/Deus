//=============================================================================
// UF_Sheet.js - Backward compatibility shim forwarding to DEUS_Sheet.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Sheet] Entity inspection panel: 14-slot equipment paperdoll, inventory grid, attributes, and object contents.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Sheet")) {
            PluginManager.loadScript("DEUS_Sheet");
        }
    }
})();
