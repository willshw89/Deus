//=============================================================================
// UF_Items.js - Backward compatibility shim forwarding to DEUS_Items.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Items] Ground item entities, inventory stacks, material properties, decay rates, and container storage.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Items")) {
            PluginManager.loadScript("DEUS_Items");
        }
    }
})();
