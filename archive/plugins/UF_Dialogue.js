//=============================================================================
// UF_Dialogue.js - Backward compatibility shim forwarding to DEUS_Dialogue.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Compatibility Shim] Forwards to DEUS_Dialogue.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Dialogue")) {
            PluginManager.loadScript("DEUS_Dialogue");
        }
    }
})();
