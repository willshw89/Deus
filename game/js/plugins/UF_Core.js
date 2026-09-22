//=============================================================================
// UF_Core.js - Backward compatibility shim forwarding to DEUS_Core.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Core] Foundation systems: shared state, time domains, deterministic RNG, coordinate math, spatial queries, and engine hooks.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Core")) {
            PluginManager.loadScript("DEUS_Core");
        }
    }
})();
