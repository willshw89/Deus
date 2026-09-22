//=============================================================================
// UF_FactionMenus.js - Backward compatibility shim forwarding to DEUS_FactionMenus.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS FactionMenus] Dynamic cultural UI themes, window skins, Title Screen embark setup, and custom faction mouse cursors.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_FactionMenus")) {
            PluginManager.loadScript("DEUS_FactionMenus");
        }
    }
})();
