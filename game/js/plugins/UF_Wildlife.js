//=============================================================================
// UF_Wildlife.js - Backward compatibility shim forwarding to DEUS_Wildlife.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Wildlife] Wild fauna populations, grazing herds, predator/prey behaviors, sensory awareness, and flee AI.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Wildlife")) {
            PluginManager.loadScript("DEUS_Wildlife");
        }
    }
})();
