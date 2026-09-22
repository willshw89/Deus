//=============================================================================
// UF_Floors.js - Backward compatibility shim forwarding to DEUS_Floors.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Floors] Room enclosure detection, cultural flooring construction, floor autotiles, and architectural room value.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Floors")) {
            PluginManager.loadScript("DEUS_Floors");
        }
    }
})();
