//=============================================================================
// UF_Doors.js - Backward compatibility shim forwarding to DEUS_Doors.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Doors] Cultural architectural doors, faction-aware access control, open/closed animation states, and durability.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Doors")) {
            PluginManager.loadScript("DEUS_Doors");
        }
    }
})();
