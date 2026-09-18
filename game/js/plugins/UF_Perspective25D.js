//=============================================================================
// RPG Maker MZ - Ultima Fortress: 2.5D Axonometric Perspective Engine
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Perspective25D] Ultima VII 2.5D axonometric projection, Z-elevation, dynamic depth sorting, canopy occlusion, and cast shadows.
 * @author Deepdelve Architect
 *
 * @param TileHeightStep
 * @text Elevation Height Step (px)
 * @type number
 * @default 36
 * @desc Screen Y offset per Z-elevation level (36px for 3/4 axonometric perspective).
 *
 * @param EnableShadows
 * @text Enable 2.5D Ground Shadows
 * @type boolean
 * @default true
 * @desc Render dynamic 2.5D oval cast shadows underneath characters and elevated objects.
 *
 * @param OcclusionOpacity
 * @text Occlusion Opacity
 * @type number
 * @default 120
 * @desc Target opacity (0-255) for tree canopies and roofs when a character is underneath.
 *
 * @help
 * ============================================================================
 * Ultima Fortress 2.5D Axonometric Perspective (UF_Perspective25D)
 * ============================================================================
 * Implements the signature visual presentation of Ultima VII: The Black Gate:
 * - 2.5D Z-Elevation on the tile grid (jumping, ramps, table/barrel stacking)
 * - Dynamic tactile depth sorting (objects, characters, tall scenery)
 * - Canopy and roof occlusion cutaways (smooth fade-out when walking under trees/roofs)
 * - 2.5D ground cast shadows grounded at physical (x, y) coordinates
 * - Minimal engine modification via standard aliasing
 */

(() => {
    "use strict";

    const pluginName = "UF_Perspective25D";
    const params = PluginManager.parameters(pluginName);
    const tileHeightStep = parseInt(params["TileHeightStep"] || 36, 10);
    const enableShadows = false; // Completely disabled per user request
    const occlusionOpacity = parseInt(params["OcclusionOpacity"] || 120, 10);

    //-----------------------------------------------------------------------------
    // Game_CharacterBase: Z-Elevation & Stacking
    //-----------------------------------------------------------------------------
    const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
    Game_CharacterBase.prototype.initMembers = function() {
        _Game_CharacterBase_initMembers.call(this);
        this._elevation = 0; // Z-level (0 = ground, 1 = table/ledge, etc.)
        this._isOccluded = false;
        this._castShadow = true;
    };

    Game_CharacterBase.prototype.elevation = function() {
        return this._elevation || 0;
    };

    Game_CharacterBase.prototype.setElevation = function(z) {
        this._elevation = z;
    };

    // Override screenY to account for 2.5D Z-elevation offset
    Game_CharacterBase.prototype.screenY = function() {
        const th = $gameMap.tileHeight();
        const baseScreenY = Math.round(
            $gameMap.adjustY(this._realY) * th + th - this.shiftY() - this.jumpHeight()
        );
        const zOffset = Math.round(this.elevation() * tileHeightStep);
        return baseScreenY - zOffset;
    };

    // Ground screenY for shadow projection (ignores elevation and jump)
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
    // Sprite_Character: Dynamic Depth Sorting & 2.5D Shadow Attachment
    //-----------------------------------------------------------------------------
    const _Sprite_Character_initMembers = Sprite_Character.prototype.initMembers;
    Sprite_Character.prototype.initMembers = function() {
        _Sprite_Character_initMembers.call(this);
        this._shadowSprite = null;
        if (enableShadows) {
            this.create2DShadow();
        }
    };

    Sprite_Character.prototype.create2DShadow = function() {
        this._shadowSprite = new Sprite();
        // Create 2.5D oval shadow bitmap
        const sw = 32;
        const sh = 16;
        const bmp = new Bitmap(sw, sh);
        const ctx = bmp.context;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(sw / 2, sh / 2, sw / 2 - 2, sh / 2 - 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10, 10, 15, 0.45)";
        ctx.fill();
        ctx.restore();
        bmp._baseTexture.update();
        this._shadowSprite.bitmap = bmp;
        this._shadowSprite.anchor.x = 0.5;
        this._shadowSprite.anchor.y = 0.5;
        this._shadowSprite.z = 1; // Above ground tile, below character
    };

    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        this.update2DShadow();
        this.updateOcclusion();
    };

    Sprite_Character.prototype.update2DShadow = function() {
        if (!this._shadowSprite || !this._character) return;
        if (this._character === $gamePlayer || !this._character.characterName()) {
            this._shadowSprite.visible = false;
            return;
        }
        if (this._character.event && this._character.event() && 
            (this._character.event().note.includes("<tree>") || this._character.event().note.includes("<canopy>"))) {
            this._shadowSprite.visible = false;
            return;
        }

        // Only show shadow for visible living characters
        if (this._character.isTransparent() || this._character.opacity() === 0 || !this.visible) {
            this._shadowSprite.visible = false;
            return;
        }

        // Add to parent tilemap if not yet added
        if (!this._shadowSprite.parent && this.parent) {
            this.parent.addChildAt(this._shadowSprite, 0);
        }

        this._shadowSprite.visible = true;
        this._shadowSprite.x = this._character.groundScreenX();
        this._shadowSprite.y = this._character.groundScreenY();

        // Scale shadow slightly smaller when elevated or jumping
        const totalHeight = (this._character.elevation() * tileHeightStep) + this._character.jumpHeight();
        const scaleFactor = Math.max(0.5, 1.0 - (totalHeight / 200));
        this._shadowSprite.scale.x = scaleFactor;
        this._shadowSprite.scale.y = scaleFactor;
        this._shadowSprite.opacity = Math.round(255 * scaleFactor);
    };

    // Dynamic Depth Sorting
    const _Sprite_Character_updatePosition = Sprite_Character.prototype.updatePosition;
    Sprite_Character.prototype.updatePosition = function() {
        _Sprite_Character_updatePosition.call(this);
        if (this._character) {
            // Foot-position depth sorting matching Ultima VII
            const footY = Math.round($gameMap.adjustY(this._character._realY) * 48 + 48);
            const priorityBonus = this._character.isPriorityAbove() ? 1000 : (this._character.isPriorityBelow() ? -100 : 0);
            this.z = footY + priorityBonus;
        }
    };

    Game_CharacterBase.prototype.isPriorityAbove = function() {
        return this._priorityType === 2;
    };

    Game_CharacterBase.prototype.isPriorityBelow = function() {
        return this._priorityType === 0;
    };

    //-----------------------------------------------------------------------------
    // Canopy & Roof Occlusion Transparency (Ultima VII Cutaways)
    //-----------------------------------------------------------------------------
    Sprite_Character.prototype.updateOcclusion = function() {
        if (!this._character || !($gameMap && $gamePlayer)) return;

        // Check if this sprite is an overhead scenery/canopy event
        const isCanopy = this._character._isCanopy || (this._character.event && this._character.event() && 
                         (this._character.event().note.includes("<canopy>") || this._character.event().note.includes("<tree>")));
        
        if (!isCanopy) return;

        // Check if player or any colonist is within the canopy bounding box (e.g. 1 tile above/behind)
        const cx = this._character.x;
        const cy = this._character.y;
        let occluded = false;

        // Check player
        if (Math.abs($gamePlayer.x - cx) <= 1 && ($gamePlayer.y >= cy - 1 && $gamePlayer.y <= cy + 1)) {
            occluded = true;
        }

        // Check all colonists/NPCs
        if (!occluded) {
            for (const ev of $gameMap.events()) {
                if (ev && ev._isColonist && Math.abs(ev.x - cx) <= 1 && (ev.y >= cy - 1 && ev.y <= cy + 1)) {
                    occluded = true;
                    break;
                }
            }
        }

        // Smooth opacity fade
        const targetOpacity = occluded ? occlusionOpacity : 255;
        if (this.opacity !== targetOpacity) {
            const step = 15;
            if (this.opacity > targetOpacity) {
                this.opacity = Math.max(targetOpacity, this.opacity - step);
            } else {
                this.opacity = Math.min(targetOpacity, this.opacity + step);
            }
        }
    };

    console.log("[UF] UF_Perspective25D initialized: 2.5D Z-elevation, dynamic depth sorting, cast shadows, canopy occlusion active.");
})();

