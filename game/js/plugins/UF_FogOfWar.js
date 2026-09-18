//=============================================================================
// RPG Maker MZ - Ultima Fortress: Faction-Based Dynamic Fog of War
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF FogOfWar] Faction-based dynamic line-of-sight (LOS) Fog of War. Shrouds unseen terrain and hides unobserved entities.
 * @author Deepdelve Architect
 *
 * @param DefaultSightRadius
 * @text Default Sight Radius (Tiles)
 * @type number
 * @default 8
 * @desc Default vision radius in tiles for faction members.
 *
 * @param ExploredDarkness
 * @text Explored Fog Opacity (0.0 - 1.0)
 * @type number
 * @decimals 2
 * @default 0.65
 * @desc Opacity of the fog over explored terrain when not in active sight.
 *
 * @help
 * ============================================================================
 * Ultima Fortress Faction Fog of War (UF_FogOfWar)
 * ============================================================================
 * Implements:
 * - Dynamic line-of-sight (LOS) for player faction members (Adam & Eve)
 * - Two-tier fog:
 *   1. Pitch Black (100% opaque): Unexplored terrain never witnessed by the faction
 *   2. Ambient Fog (65% opaque): Explored static terrain outside current vision
 *   3. Clear Vision (100% visible): Area currently observed by living faction members
 * - Hides non-faction entities and wildlife when outside active line of sight
 * - Soft circular radial vision illumination around each observer
 */

(() => {
    "use strict";

    const pluginName = "UF_FogOfWar";
    const params = PluginManager.parameters(pluginName);
    const defaultSightRadius = parseInt(params["DefaultSightRadius"] || 8, 10);
    const exploredAlpha = parseFloat(params["ExploredDarkness"] || 0.65);

    // Initialize or retrieve persistent explored grid
    Game_System.prototype.getExploredGrid = function(mapId) {
        this._ufExploredMaps = this._ufExploredMaps || {};
        if (!this._ufExploredMaps[mapId]) {
            this._ufExploredMaps[mapId] = {};
        }
        return this._ufExploredMaps[mapId];
    };

    Game_System.prototype.isTileExplored = function(mapId, x, y) {
        const grid = this.getExploredGrid(mapId);
        return !!grid[`${x},${y}`];
    };

    Game_System.prototype.exploreTile = function(mapId, x, y) {
        const grid = this.getExploredGrid(mapId);
        grid[`${x},${y}`] = true;
    };

    //-----------------------------------------------------------------------------
    // Sprite_FogOfWar: Dedicated Fullscreen LOS Overlay Layer
    //-----------------------------------------------------------------------------
    class Sprite_FogOfWar extends Sprite {
        constructor() {
            super();
            this.bitmap = new Bitmap(Graphics.width, Graphics.height);
            this.z = 8; // Above map & characters, below UI
            this._lastCameraX = -999;
            this._lastCameraY = -999;
            this._updateThrottle = 0;
        }

        update() {
            super.update();
            if (!$gameMap) return;

            this._updateThrottle++;
            if (this._updateThrottle % 2 === 0) {
                this.renderFog();
            }
        }

        renderFog() {
            const bmp = this.bitmap;
            if (!bmp || !bmp.context) return;
            const ctx = bmp.context;
            const mapId = $gameMap.mapId();
            const tw = $gameMap.tileWidth();
            const th = $gameMap.tileHeight();

            // Collect active faction observers
            const observers = [];
            if (window.$colonyManager && window.$colonyManager.colonists) {
                for (const c of $colonyManager.colonists) {
                    if (c.event && !c.event.isTransparent()) {
                        observers.push({
                            x: c.event.x,
                            y: c.event.y,
                            screenX: c.event.screenX(),
                            screenY: c.event.screenY() - th / 2,
                            radius: (c.visionRadius || defaultSightRadius) * tw
                        });
                    }
                }
            }

            // Fallback: If no colonists exist yet, use player position
            if (observers.length === 0 && $gamePlayer) {
                observers.push({
                    x: $gamePlayer.x,
                    y: $gamePlayer.y,
                    screenX: $gamePlayer.screenX(),
                    screenY: $gamePlayer.screenY() - th / 2,
                    radius: defaultSightRadius * tw
                });
            }

            // Update explored tiles in grid for all observers
            for (const obs of observers) {
                const tileRadius = Math.ceil(obs.radius / tw);
                for (let dx = -tileRadius; dx <= tileRadius; dx++) {
                    for (let dy = -tileRadius; dy <= tileRadius; dy++) {
                        if (dx * dx + dy * dy <= tileRadius * tileRadius) {
                            $gameSystem.exploreTile(mapId, obs.x + dx, obs.y + dy);
                        }
                    }
                }
            }

            // 1. Clear bitmap
            ctx.clearRect(0, 0, Graphics.width, Graphics.height);

            // 2. Draw base pitch black shroud for unexplored, and ambient fog for explored
            const startX = Math.floor($gameMap.displayX());
            const startY = Math.floor($gameMap.displayY());
            const tilesX = Math.ceil(Graphics.width / tw) + 2;
            const tilesY = Math.ceil(Graphics.height / th) + 2;

            for (let ty = 0; ty < tilesY; ty++) {
                for (let tx = 0; tx < tilesX; tx++) {
                    const gx = startX + tx;
                    const gy = startY + ty;
                    const screenTileX = Math.round($gameMap.adjustX(gx) * tw);
                    const screenTileY = Math.round($gameMap.adjustY(gy) * th);

                    const explored = $gameSystem.isTileExplored(mapId, gx, gy);
                    if (!explored) {
                        ctx.fillStyle = "rgba(4, 8, 12, 1.0)";
                        ctx.fillRect(screenTileX, screenTileY, tw, th);
                    } else {
                        ctx.fillStyle = `rgba(10, 16, 22, ${exploredAlpha})`;
                        ctx.fillRect(screenTileX, screenTileY, tw, th);
                    }
                }
            }

            // 3. Cut out active line-of-sight illumination with soft radial feathering
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";

            for (const obs of observers) {
                const grad = ctx.createRadialGradient(
                    obs.screenX, obs.screenY, obs.radius * 0.45,
                    obs.screenX, obs.screenY, obs.radius
                );
                grad.addColorStop(0, "rgba(0, 0, 0, 1.0)");
                grad.addColorStop(0.7, "rgba(0, 0, 0, 0.85)");
                grad.addColorStop(1, "rgba(0, 0, 0, 0.0)");

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(obs.screenX, obs.screenY, obs.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            bmp._baseTexture.update();
        }
    }

    // Attach FogOfWar layer to Spriteset_Map
    const _Spriteset_Map_createUpperLayer = Spriteset_Map.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function() {
        _Spriteset_Map_createUpperLayer.call(this);
        this._fogOfWar = new Sprite_FogOfWar();
        this.addChild(this._fogOfWar);
    };

    console.log("[UF] UF_FogOfWar initialized: Faction line-of-sight and two-tier dynamic shroud active.");
})();
