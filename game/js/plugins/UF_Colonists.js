//=============================================================================
// UF_Colonists.js - Backward compatibility shim forwarding to DEUS_Colonists.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Colonists] Colony population manager, autonomous AI schedules, society planning, and colonist equipment priorities.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Colonists")) {
            PluginManager.loadScript("DEUS_Colonists");
        }
    }
})();
