//=============================================================================
// UF_World.js - Backward compatibility shim forwarding to DEUS_World.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS World] Seeded multi-level procedural world generation, persistent area maps, coordinate translation, and world state.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_World")) {
            PluginManager.loadScript("DEUS_World");
        }
    }
})();
