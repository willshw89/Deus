//=============================================================================
// UF_Jobs.js - Backward compatibility shim forwarding to DEUS_Jobs.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Jobs] Autonomous colony job dispatch, work reservations, tool efficiency scaling, and task execution.
 * @author DEUS Project
 */
(() => {
    "use strict";
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Jobs")) {
            PluginManager.loadScript("DEUS_Jobs");
        }
    }
})();
