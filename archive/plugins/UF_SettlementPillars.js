//=============================================================================
// UF_SettlementPillars.js - Backward compatibility shim forwarding to DEUS_SettlementPillars.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_SettlementPillars.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_SettlementPillars")) {
            PluginManager.loadScript("DEUS_SettlementPillars");
        }
    }
})();
