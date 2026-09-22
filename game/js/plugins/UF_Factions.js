//=============================================================================
// UF_Factions.js - Backward compatibility shim forwarding to DEUS_Factions.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Factions] 11 cultural factions, cultural identities, diplomatic relations, and stance matrices.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Factions")) {
            PluginManager.loadScript("DEUS_Factions");
        }
    }
})();
