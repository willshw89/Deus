//=============================================================================
// UF_Combat.js - Backward compatibility shim forwarding to DEUS_Combat.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Combat] Real-time tick-based combat: SRD 5.1 attack/defense rolls, hit resolution, damage splats, and health bars.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Combat")) {
            PluginManager.loadScript("DEUS_Combat");
        }
    }
})();
