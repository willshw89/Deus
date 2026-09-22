//=============================================================================
// UF_Levels.js - Backward compatibility shim forwarding to DEUS_Levels.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Levels] Multi-level vertical world: 5 persistent elevation layers (-2 to +2), caverns, and Z-level transitions.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Levels")) {
            PluginManager.loadScript("DEUS_Levels");
        }
    }
})();
