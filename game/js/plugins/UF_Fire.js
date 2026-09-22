//=============================================================================
// UF_Fire.js - Backward compatibility shim forwarding to DEUS_Fire.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Fire] Cellular fire propagation, material flammability, burn damage, firefighter water bucket jobs, and burnout.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Fire")) {
            PluginManager.loadScript("DEUS_Fire");
        }
    }
})();
