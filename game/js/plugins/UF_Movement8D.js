//=============================================================================
// UF_Movement8D.js - Backward compatibility shim forwarding to DEUS_Movement8D.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Movement8D] 8-directional movement, Octile A* pathfinding, strict corner collision, and diagonal navigation.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Movement8D")) {
            PluginManager.loadScript("DEUS_Movement8D");
        }
    }
})();
