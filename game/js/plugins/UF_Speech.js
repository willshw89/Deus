//=============================================================================
// UF_Speech.js - Backward compatibility shim forwarding to DEUS_Speech.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Speech] Floating overhead dialogue balloons, situational barks, emotional remarks, and colony announcements.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Speech")) {
            PluginManager.loadScript("DEUS_Speech");
        }
    }
})();
