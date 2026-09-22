//=============================================================================
// UF_DayNight.js - Backward compatibility shim forwarding to DEUS_DayNight.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS DayNight] Celestial day/night cycle, dynamic ambient lighting, solar shadows, underground illumination, and clock HUD.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_DayNight")) {
            PluginManager.loadScript("DEUS_DayNight");
        }
    }
})();
