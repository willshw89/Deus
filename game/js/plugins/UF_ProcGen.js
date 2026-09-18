//=============================================================================
// RPG Maker MZ - UF: glade embark setup
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF ProcGen] Starts the colony (Adam and Eve) when the glade is loaded. World generation lives in UF_WorldGen.
 * @author UF project
 *
 * @help
 * When a map whose note contains <glade> is loaded (the start area built by
 * UF_World from Map002), make sure the starting colonists exist.
 *
 * World generation (terrain, the river, trees, rocks) moved to
 * UF_WorldGen.js on 2026-09-18, driven by data/UF_WorldCatalog.json.
 * The earlier df_wilderness_generator is in git history (commit a09d3fd).
 */

(() => {
    "use strict";

    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);
        this.populateGladeEmbark();
    };

    Scene_Map.prototype.populateGladeEmbark = function() {
        if (!$dataMap || (!$dataMap.note.includes("<glade>") && $gameMap.mapId() !== 2)) return;
        if (window.$colonyManager && window.$colonyManager.colonists.length === 0) {
            window.$colonyManager.initGladeColonists();
        }
    };
})();
