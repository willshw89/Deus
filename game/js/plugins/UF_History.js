//=============================================================================
// UF_History.js - Backward compatibility shim forwarding to DEUS_History.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS History] World history generation, settlement founding, faction site placement, founder genealogies, and historical events.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_History")) {
            PluginManager.loadScript("DEUS_History");
        }
    }
})();
