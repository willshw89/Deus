//=============================================================================
// UF_Generator.js - Backward compatibility shim forwarding to DEUS_Generator.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Generator] Procedural composite character sprite assembly, portrait generation, and demographic variation.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Generator")) {
            PluginManager.loadScript("DEUS_Generator");
        }
    }
})();
