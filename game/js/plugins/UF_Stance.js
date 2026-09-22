//=============================================================================
// UF_Stance.js - Backward compatibility shim forwarding to DEUS_Stance.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Stance] Diplomatic stance indicators: colored selection rings reflecting unit disposition (friendly, neutral, hostile).
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Stance")) {
            PluginManager.loadScript("DEUS_Stance");
        }
    }
})();
