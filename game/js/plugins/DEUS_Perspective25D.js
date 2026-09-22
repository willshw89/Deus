//=============================================================================
// RPG Maker MZ - DEUS: Pure 2D Top-Down Perspective & Viewport Culling Engine
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Perspective25D] Pure 2D top-down perspective, camera viewport culling, and tactile foot-Y depth sorting.
 * @author Deepdelve Architect
 *
 * @help
 * ============================================================================
 * Project DEUS - Pure 2D Top-Down Perspective & Viewport Culling Engine
 * ============================================================================
 * - Pure 2D top-down rendering (FF5 scale 48px humanoids, FF6 scale 96px creatures).
 * - Zero 2.5D axonometric elevation projection or fake offsets.
 * - Strict camera viewport culling: off-screen sprites bypass update and Pixi rendering.
 * - Tactile 2D foot-Y depth sorting matching classic 16-bit RPGs.
 * - Zero CPU/GPU shadow or occlusion scan overhead.
 */

(() => {
    "use strict";

    const pluginName = "DEUS_Perspective25D";

    //-----------------------------------------------------------------------------
    // Game_CharacterBase: Z-Elevation & Clean 2D Coordinates
    //-----------------------------------------------------------------------------
    const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
    Game_CharacterBase.prototype.initMembers = function() {
        _Game_CharacterBase_initMembers.call(this);
        this._elevation = 0; // Simulation Z-level (persistent multi-layer support)
    };

    Game_CharacterBase.prototype.elevation = function() {
        return this._elevation || 0;
    };

    Game_CharacterBase.prototype.setElevation = function(z) {
        this._elevation = z;
    };

    // Standard Pure 2D Top-Down screenY (FF5/FF6 style, no axonometric distortion)
    Game_CharacterBase.prototype.screenY = function() {
        const th = $gameMap.tileHeight();
        return Math.floor(
            $gameMap.adjustY(this._realY) * th + th - this.shiftY() - this.jumpHeight()
        );
    };

    // Ground screenY
    Game_CharacterBase.prototype.groundScreenY = function() {
        const th = $gameMap.tileHeight();
        return Math.round($gameMap.adjustY(this._realY) * th + th - 4);
    };

    // Ground screenX
    Game_CharacterBase.prototype.groundScreenX = function() {
        const tw = $gameMap.tileWidth();
        return Math.round($gameMap.adjustX(this._realX) * tw + tw / 2);
    };

    //-----------------------------------------------------------------------------
    // Sprite_Character: Camera Viewport Culling
    //-----------------------------------------------------------------------------
    // In RPG Maker MZ, Spriteset_Map creates a Sprite_Character for all 1000+ units.
    // By strictly culling off-screen sprites before updateBitmap/updateFrame/render,
    // we eliminate off-screen CPU/GPU matrix overhead on 256x256 maps.
    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        if (!this._character) {
            this.visible = false;
            return;
        }

        // Camera viewport culling: only process units within or near the camera view
        if (this._character !== $gamePlayer && window.$gameMap) {
            const rx = this._character._realX;
            const ry = this._character._realY;
            if (typeof rx === "number" && typeof ry === "number") {
                const sx = $gameMap.adjustX(rx);
                const sy = $gameMap.adjustY(ry);
                const vw = $gameMap.screenTileX ? $gameMap.screenTileX() : 27;
                const vh = $gameMap.screenTileY ? $gameMap.screenTileY() : 16;
                // Margins: +2 tiles horizontal/bottom, +4 tiles top (accommodates 96px 2-tile FF6 monsters and tall flora)
                if (sx < -2 || sx > vw + 2 || sy < -4 || sy > vh + 2) {
                    this.visible = false;
                    return;
                }
            }
        }

        this.visible = true;
        _Sprite_Character_update.call(this);
    };

    //-----------------------------------------------------------------------------
    // Sprite_Character: Pure 2D Foot-Y Dynamic Depth Sorting
    //-----------------------------------------------------------------------------
    Game_CharacterBase.prototype.screenZ = function() {
        const th = $gameMap ? $gameMap.tileHeight() : 48;
        const footY = Math.round(($gameMap ? $gameMap.adjustY(this._realY) : (typeof this._realY === "number" ? this._realY : 0)) * th + th);
        const priorityBonus = this.isPriorityAbove() ? 1000 : (this.isPriorityBelow() ? -100 : 0);
        return footY + priorityBonus;
    };

    const _Sprite_Character_updatePosition = Sprite_Character.prototype.updatePosition;
    Sprite_Character.prototype.updatePosition = function() {
        _Sprite_Character_updatePosition.call(this);
        if (this._character) {
            this.z = this._character.screenZ();
        }
    };

    const _Sprite_Character_updateOther = Sprite_Character.prototype.updateOther;
    Sprite_Character.prototype.updateOther = function() {
        _Sprite_Character_updateOther.call(this);
        if (this._character) {
            this.z = this._character.screenZ();
        }
    };

    Game_CharacterBase.prototype.isPriorityAbove = function() {
        return this._priorityType === 2;
    };

    Game_CharacterBase.prototype.isPriorityBelow = function() {
        return this._priorityType === 0;
    };

    console.log("[DEUS] DEUS_Perspective25D active: Pure 2D top-down perspective, viewport culling, tactile foot-Y sorting enabled.");
})();
