//=============================================================================
// UF_Environment.js - Backward compatibility shim forwarding to DEUS_Environment.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Environment] Environmental simulation: ambient temperature, body regulation, shelter insulation, and weather effects.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Environment")) {
            PluginManager.loadScript("DEUS_Environment");
        }
    }
})();
