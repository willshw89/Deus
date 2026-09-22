//=============================================================================
// UF_Ownership.js - Backward compatibility shim forwarding to DEUS_Ownership.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Ownership] Entity property ownership, personal bed claims, private quarters designation, and sleep allocation.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Ownership")) {
            PluginManager.loadScript("DEUS_Ownership");
        }
    }
})();
