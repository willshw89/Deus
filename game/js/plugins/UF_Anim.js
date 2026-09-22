//=============================================================================
// UF_Anim.js - Backward compatibility shim forwarding to DEUS_Anim.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Anim] Sprite-driven animation engine for 12-sprite character sets, directional action cycles, and object states.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Anim")) {
            PluginManager.loadScript("DEUS_Anim");
        }
    }
})();
