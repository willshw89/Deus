//=============================================================================
// RPG Maker MZ - UF: glade embark setup (retired)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF ProcGen] Retired: the start is the player's faction's home site (UF_History) and its people are the colonists (UF_Colonists). World generation lives in UF_WorldGen.
 * @author UF project
 *
 * @help
 * Kept only so older plugin lists and callers of
 * Scene_Map.prototype.populateGladeEmbark keep working: the method exists and
 * does nothing (2026-09-18). The colonists are made by UF_Colonists on
 * world:created from the people UF_History spawned at the home site.
 *
 * World generation (terrain, rivers, plants, sites) moved to UF_WorldGen.js
 * on 2026-09-18, driven by data/UF_WorldCatalog.json. The earlier
 * df_wilderness_generator is in git history (commit a09d3fd).
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    // A no-op: nothing is populated at map load any more (UF_Colonists owns the colony).
    Scene_Map.prototype.populateGladeEmbark = function() {};
})();
