//=============================================================================
// RPG Maker MZ - Ultima Fortress: Visuals, Roof Cutaways, Barks & Lighting
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Visuals] Roof cutaways, overhead floating speech barks, and 24-hour day/night atmospheric lighting.
 * @author Deepdelve Architect
 *
 * @param EnableRoofs
 * @text Enable Roof Cutaways
 * @type boolean
 * @default true
 *
 * @param EnableBarks
 * @text Enable Speech Barks
 * @type boolean
 * @default true
 *
 * @param EnableLighting
 * @text Enable Day/Night Lighting
 * @type boolean
 * @default true
 *
 * @help
 * ============================================================================
 * Ultima Fortress Visuals Plugin
 * ============================================================================
 * 1. Roof Cutaways:
 *    - Tiles with Region IDs 50-99 define building interiors.
 *    - Roof tiles placed on map layer 3/4 or marked with region 50-99 fade
 *      smoothly to 0% opacity when the player walks inside!
 *
 * 2. Overhead Speech Barks:
 *    - Events can bark ambient chatter above their heads using:
 *      Plugin Command: Bark [EventId] [Text]
 *      Or note tags: <bark: Hail, traveller!|Praise the miners!>
 *    - Styled with classic Ultima serif typography and golden drop-shadow.
 *
 * 3. Day/Night Lighting:
 *    - Seamless 24h tint cycle tied to $ufTime.
 *    - Maps with <interior> in their note tag maintain warm hearth ambient light.
 */

(() => {
    "use strict";

    const pluginName = "UF_Visuals";
    const params = PluginManager.parameters(pluginName);
    const enableRoofs = (params["EnableRoofs"] || "true") === "true";
    const enableBarks = (params["EnableBarks"] || "true") === "true";
    const enableLighting = (params["EnableLighting"] || "true") === "true";

    window.UF_Visuals = {};

    //-----------------------------------------------------------------------------
    // Overhead Speech Bark Sprite
    //-----------------------------------------------------------------------------
    class Sprite_UFBark extends Sprite {
        constructor(character, text, duration = 180) {
            super();
            this.character = character;
            this.duration = duration;
            this.maxDuration = duration;
            this.anchor.x = 0.5;
            this.anchor.y = 1.0;
            this.z = 900000; // Above characters and objects (their z is the foot pixel row, up to ~12000) and below the fog (1e6). Was 9, which hid every bark (found 2026-09-18).
            this.bitmap = new Bitmap(260, 48);
            this.drawBark(text);
            this.updatePosition();
        }

        drawBark(text) {
            const ctx = this.bitmap.context;
            const w = this.bitmap.width;
            const h = this.bitmap.height;

            // Measure text
            this.bitmap.fontSize = 15;
            this.bitmap.fontBold = true;
            this.bitmap.fontFace = "Georgia, serif";
            const textWidth = this.bitmap.measureTextWidth(text);
            const boxW = Math.min(w, textWidth + 24);
            const boxH = 30;
            const boxX = (w - boxW) / 2;
            const boxY = 8;

            // Draw vintage Ultima parchment / dark banner bubble
            ctx.fillStyle = "rgba(18, 14, 10, 0.88)";
            ctx.strokeStyle = "#c89d5c"; // Antique gold border
            ctx.lineWidth = 2;
            
            // Rounded rectangle
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 6);
            ctx.fill();
            ctx.stroke();

            // Downward speech pointer notch
            ctx.beginPath();
            ctx.moveTo(w / 2 - 5, boxY + boxH);
            ctx.lineTo(w / 2, boxY + boxH + 6);
            ctx.lineTo(w / 2 + 5, boxY + boxH);
            ctx.closePath();
            ctx.fillStyle = "#c89d5c";
            ctx.fill();

            // Golden text
            this.bitmap.textColor = "#ffe39f";
            this.bitmap.outlineColor = "black";
            this.bitmap.outlineWidth = 3;
            this.bitmap.drawText(text, 0, boxY + 2, w, boxH, "center");
        }

        update() {
            super.update();
            this.updatePosition();
            this.duration--;

            if (this.duration < 30) {
                this.opacity = (this.duration / 30) * 255;
            }

            if (this.duration <= 0) {
                if (this.parent) this.parent.removeChild(this);
            }
        }

        updatePosition() {
            if (!this.character) return;
            const scX = this.character.screenX();
            const scY = this.character.screenY() - 56;
            this.x = scX;
            this.y = scY;
        }
    }

    UF_Visuals.bark = function(character, text, duration = 180) {
        if (!enableBarks || !SceneManager._scene._spriteset) return;
        const barkSprite = new Sprite_UFBark(character, text, duration);
        SceneManager._scene._spriteset._tilemap.addChild(barkSprite);
    };

    //-----------------------------------------------------------------------------
    // Ambient Barks from Event Notes & Schedules
    //-----------------------------------------------------------------------------
    const _Game_Event_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
        _Game_Event_setupPage.call(this);
        this._ufBarkList = [];
        this._ufBarkTimer = Math.floor(Math.random() * 300) + 300; // 5-10 seconds
        if (this.event() && this.event().note) {
            const match = this.event().note.match(/<bark:\s*(.+?)>/i);
            if (match) {
                this._ufBarkList = match[1].split("|").map(s => s.trim());
            }
        }
    };

    const _Game_Event_update = Game_Event.prototype.update;
    Game_Event.prototype.update = function() {
        _Game_Event_update.call(this);
        if (enableBarks && this._ufBarkList && this._ufBarkList.length > 0 && !this._erased) {
            this._ufBarkTimer--;
            if (this._ufBarkTimer <= 0) {
                this._ufBarkTimer = Math.floor(Math.random() * 600) + 600; // 10-20 seconds
                // Only bark if player is within 8 tiles
                const dist = Math.hypot(this.x - $gamePlayer.x, this.y - $gamePlayer.y);
                if (dist <= 8) {
                    const text = this._ufBarkList[Math.floor(Math.random() * this._ufBarkList.length)];
                    UF_Visuals.bark(this, text);
                }
            }
        }
    };

    //-----------------------------------------------------------------------------
    // Roof Cutaway System
    //-----------------------------------------------------------------------------
    // Roof Cutaway System
    //-----------------------------------------------------------------------------
    // In U7, when entering a building, the roof layer over that building fades out.
    // Region IDs 50 to 99 are designated as Building Interior Regions.
    class Sprite_UFRoofBuilding extends Sprite {
        constructor(regionId) {
            super();
            this.regionId = regionId;
            this.z = 8;
            this.currentAlpha = 1.0;
            this.targetAlpha = 1.0;
            this.createRoofBitmap();
        }

        createRoofBitmap() {
            const tw = $gameMap.tileWidth() || 48;
            const th = $gameMap.tileHeight() || 48;
            const mapW = $gameMap.width() || 20;
            const mapH = $gameMap.height() || 15;

            this.bitmap = new Bitmap(mapW * tw, mapH * th);
            const ctx = this.bitmap.context;

            for (let y = 0; y < mapH; y++) {
                for (let x = 0; x < mapW; x++) {
                    if ($gameMap.regionId(x, y) === this.regionId) {
                        const px = x * tw;
                        const py = y * th;

                        // Base roof slate / wood shingle
                        ctx.fillStyle = "#3c332a";
                        ctx.fillRect(px, py, tw, th);

                        // Shingle rows
                        for (let r = 0; r < 4; r++) {
                            const sy = py + r * 12;
                            // Highlight top of row
                            ctx.fillStyle = "#55483b";
                            ctx.fillRect(px, sy, tw, 1);
                            // Shadow bottom of row
                            ctx.fillStyle = "#26201a";
                            ctx.fillRect(px, sy + 11, tw, 1);

                            // Shingle vertical joints (alternating)
                            const offset = (r % 2 === 0) ? 0 : 12;
                            ctx.fillStyle = "#1e1914";
                            for (let j = offset; j < tw; j += 24) {
                                ctx.fillRect(px + j, sy, 1, 11);
                            }
                        }

                        // Top ridge beam if upper tile is not this roof
                        if ($gameMap.regionId(x, y - 1) !== this.regionId) {
                            ctx.fillStyle = "#705030";
                            ctx.fillRect(px, py, tw, 4);
                            ctx.fillStyle = "#9a7044";
                            ctx.fillRect(px, py, tw, 1);
                            ctx.fillStyle = "#352414";
                            ctx.fillRect(px, py + 3, tw, 1);
                        }

                        // Bottom eave / overhang if lower tile is not this roof
                        if ($gameMap.regionId(x, y + 1) !== this.regionId) {
                            ctx.fillStyle = "#503820";
                            ctx.fillRect(px, py + th - 4, tw, 4);
                            ctx.fillStyle = "#261a0e";
                            ctx.fillRect(px, py + th - 1, tw, 1);
                        }

                        // Left timber trim
                        if ($gameMap.regionId(x - 1, y) !== this.regionId) {
                            ctx.fillStyle = "#604225";
                            ctx.fillRect(px, py, 3, th);
                        }

                        // Right timber trim
                        if ($gameMap.regionId(x + 1, y) !== this.regionId) {
                            ctx.fillStyle = "#604225";
                            ctx.fillRect(px + tw - 3, py, 3, th);
                        }
                    }
                }
            }
        }

        update() {
            super.update();
            if (!enableRoofs) return;

            // Follow map scroll
            const tw = $gameMap.tileWidth() || 48;
            const th = $gameMap.tileHeight() || 48;
            this.x = Math.round(-$gameMap.displayX() * tw);
            this.y = Math.round(-$gameMap.displayY() * th);

            const isInside = $gamePlayer.regionId() === this.regionId;
            this.targetAlpha = isInside ? 0.0 : 1.0;

            if (this.currentAlpha < this.targetAlpha) {
                this.currentAlpha = Math.min(this.targetAlpha, this.currentAlpha + 0.1);
            } else if (this.currentAlpha > this.targetAlpha) {
                this.currentAlpha = Math.max(this.targetAlpha, this.currentAlpha - 0.1);
            }
            this.opacity = Math.floor(this.currentAlpha * 255);
            this.visible = this.opacity > 0;
        }
    }

    const _Spriteset_Map_createUpperLayer = Spriteset_Map.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function() {
        _Spriteset_Map_createUpperLayer.call(this);
        if (enableRoofs && $gameMap) {
            this._ufRoofSprites = [];
            const foundRegions = new Set();
            const mapW = $gameMap.width();
            const mapH = $gameMap.height();
            for (let y = 0; y < mapH; y++) {
                for (let x = 0; x < mapW; x++) {
                    const r = $gameMap.regionId(x, y);
                    if (r >= 50 && r <= 99) {
                        foundRegions.add(r);
                    }
                }
            }
            for (const r of foundRegions) {
                const roofSprite = new Sprite_UFRoofBuilding(r);
                this._tilemap.addChild(roofSprite);
                this._ufRoofSprites.push(roofSprite);
            }
        }
    };

    //-----------------------------------------------------------------------------
    // 24-Hour Day / Night Atmospheric Lighting
    //-----------------------------------------------------------------------------
    const _Game_Screen_update = Game_Screen.prototype.update;
    Game_Screen.prototype.update = function() {
        _Game_Screen_update.call(this);
        if (!enableLighting || !window.$ufTime) return;

        // Check if current map is an interior
        const isInterior = $dataMap && $dataMap.note && $dataMap.note.includes("<interior>");
        if (isInterior) {
            // Warm hearth light indoors
            this.startTint([15, 5, -10, 10], 60);
            return;
        }

        // Calculate smooth outdoor tint based on time of day
        const h = $ufTime.hour + ($ufTime.minute / 60);
        let targetTone = [0, 0, 0, 0];

        if (h >= 4.5 && h < 7.0) {
            // Dawn: warm rose-amber
            const progress = (h - 4.5) / 2.5;
            targetTone = [
                Math.round(-50 + progress * 50),
                Math.round(-40 + progress * 40),
                Math.round(10 + progress * -10),
                Math.round(40 * (1 - progress))
            ];
        } else if (h >= 7.0 && h < 17.5) {
            // Full daylight
            targetTone = [0, 0, 0, 0];
        } else if (h >= 17.5 && h < 20.5) {
            // Dusk / Twilight: golden bronze shifting to deep twilight
            const progress = (h - 17.5) / 3.0;
            targetTone = [
                Math.round(25 - progress * 90),
                Math.round(-10 - progress * 60),
                Math.round(-20 + progress * 10),
                Math.round(progress * 55)
            ];
        } else {
            // Night: deep moonlight darkness
            targetTone = [-75, -75, -20, 55];
        }

        // Apply smooth transition if not already set by an event
        if (!this._toneDuration || this._toneDuration <= 0) {
            this.startTint(targetTone, 60);
        }
    };

    //-----------------------------------------------------------------------------
    // Plugin Commands
    //-----------------------------------------------------------------------------
    PluginManager.registerCommand(pluginName, "Bark", args => {
        const evId = parseInt(args.eventId, 10);
        const char = evId === 0 ? $gamePlayer : $gameMap.event(evId);
        if (char && args.text) {
            UF_Visuals.bark(char, args.text, parseInt(args.duration || 180, 10));
        }
    });

})();
