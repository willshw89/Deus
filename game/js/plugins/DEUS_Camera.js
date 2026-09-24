//=============================================================================
// DEUS_Camera.js - Continuous zoom, in-game view scale calibrator & pixel-exact camera navigation
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Camera] Continuous camera zoom, interactive in-game scale calibrator HUD, and pixel-exact map navigation.
 * @author DEUS project
 * @orderAfter DEUS_ColonyOverseer
 *
 * @param Levels
 * @text Zoom levels
 * @desc Map scale steps from closest to farthest, comma-separated; fractions allowed. With 3x art, 1 = 3x, 2/3 = 2x, 1/3 = 1x: all pixel-exact.
 * @default 1, 2/3, 1/3
 *
 * @param StartLevel
 * @text Starting level
 * @type number
 * @min 0
 * @default 1
 * @desc Index into Levels used at boot (0 = closest). Default 1 = 2/3 scale.
 *
 * @help
 * Interactive View Scale Calibrator:
 * - On-screen draggable HUD to test and calibrate camera zoom in real-time.
 * - Draggable slider bar spanning 0.25x to 1.75x.
 * - Quick preset buttons: [0.33x], [0.50x], [0.67x], [0.75x], [1.00x], [1.25x], [1.50x].
 * - Live physical metrics: Scale multiplier, tile px size, chibi height px, visible grid size.
 * - "★ LOCK AS OFFICIAL VIEW DISTANCE" button: persists choice to localStorage.
 * - Hotkeys:
 *     F7: Toggle Calibrator HUD visible / hidden.
 *     Zoom out: mouse wheel down, "-" or numpad "-".
 *     Zoom in:  mouse wheel up, "=" or numpad "+".
 *     Shift: Fine zoom adjustment (+/- 0.01).
 *
 * API:
 *   UF.Camera.zoom()                  -> active zoom float (e.g. 0.667)
 *   UF.Camera.setZoom(scale)          -> sets continuous zoom scale (0.20 to 2.50)
 *   UF.Camera.setLevel(i)             -> sets discrete level index (0, 1, 2)
 *   UF.Camera.saveOfficialScale(val)  -> locks official scale into localStorage
 *   UF.Camera.toggleCalibrator()      -> toggles calibrator HUD visibility
 *
 * Replaced core methods: Game_CharacterBase.isNearTheScreen (zoom-aware).
 */

(() => {
    "use strict";

    const P = (PluginManager.parameters("DEUS_Camera") && Object.keys(PluginManager.parameters("DEUS_Camera")).length
        ? PluginManager.parameters("DEUS_Camera")
        : PluginManager.parameters("UF_Camera"));

    const parseLevel = s => {
        const t = String(s).trim();
        if (t.includes("/")) {
            const [a, b] = t.split("/").map(Number);
            return a / b;
        }
        return Number(t);
    };

    const LEVELS = String(P.Levels || "1, 2/3, 1/3").split(",").map(parseLevel)
        .filter(z => z > 0 && z <= 4).sort((a, b) => b - a);
    if (LEVELS.length === 0) LEVELS.push(1);
    const START = Math.min(LEVELS.length - 1, Math.max(0, P.StartLevel !== undefined && P.StartLevel !== "" ? Number(P.StartLevel) : 1));
    const WHEEL_COOLDOWN = 6; // frames

    const STORAGE_KEY = "deus_canonical_view_scale";
    let savedOfficialScale = null;
    try {
        if (typeof localStorage !== "undefined") {
            const s = localStorage.getItem(STORAGE_KEY);
            if (s && !isNaN(Number(s))) {
                const val = Number(s);
                if (val >= 0.20 && val <= 2.50) {
                    savedOfficialScale = Math.round(val * 1000) / 1000;
                }
            }
        }
    } catch (e) {}

    let index = START;
    let customZoom = savedOfficialScale !== null ? savedOfficialScale : null;
    let wheelCooldown = 0;

    const Camera = {
        levels: LEVELS.slice(),
        officialScale: savedOfficialScale,
        calibratorVisible: true,
        calibratorX: undefined,
        calibratorY: undefined,
        calibratorMinimized: false,

        /** Returns current active zoom scale (float) */
        zoom: () => customZoom !== null ? customZoom : LEVELS[index],

        /** Returns current level index (or closest matching index) */
        level: () => {
            if (customZoom === null) return index;
            let best = 0, diff = 999;
            for (let i = 0; i < LEVELS.length; i++) {
                const d = Math.abs(LEVELS[i] - customZoom);
                if (d < diff) { diff = d; best = i; }
            }
            return best;
        },

        /** Set the zoom by discrete level index (0 = closest). Clears custom zoom. */
        setLevel(i) {
            i = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
            const targetZoom = LEVELS[i];
            if (customZoom === null && i === index) return false;
            if (customZoom !== null && Math.abs(customZoom - targetZoom) < 0.0001) {
                customZoom = null;
                index = i;
                return false;
            }

            const onMap = window.$gameMap && $gameMap.mapId() > 0 && $dataMap;
            const cx = onMap ? $gameMap.displayX() + $gameMap.screenTileX() / 2 : 0;
            const cy = onMap ? $gameMap.displayY() + $gameMap.screenTileY() / 2 : 0;

            index = i;
            customZoom = null;

            if (onMap) $gameMap.setDisplayPos(cx - $gameMap.screenTileX() / 2, cy - $gameMap.screenTileY() / 2);
            if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit("camera:zoomChanged", LEVELS[index]);
            return true;
        },

        /** Set continuous zoom scale (clamped to 0.20x .. 2.50x). Keeps center point fixed. */
        setZoom(scale, emitEvent = true) {
            const val = Math.max(0.20, Math.min(2.50, Math.round(Number(scale) * 1000) / 1000));
            const cur = this.zoom();
            if (Math.abs(cur - val) < 0.0001) return false;

            const onMap = window.$gameMap && $gameMap.mapId() > 0 && $dataMap;
            const cx = onMap ? $gameMap.displayX() + $gameMap.screenTileX() / 2 : 0;
            const cy = onMap ? $gameMap.displayY() + $gameMap.screenTileY() / 2 : 0;

            customZoom = val;
            const match = LEVELS.findIndex(z => Math.abs(z - val) < 0.001);
            if (match >= 0) index = match;

            if (onMap) $gameMap.setDisplayPos(cx - $gameMap.screenTileX() / 2, cy - $gameMap.screenTileY() / 2);
            if (emitEvent && window.UF && UF.Events && UF.Events.emit) UF.Events.emit("camera:zoomChanged", val);
            return true;
        },

        zoomOut(step = 0.05) {
            return this.setZoom(this.zoom() - step);
        },

        zoomIn(step = 0.05) {
            return this.setZoom(this.zoom() + step);
        },

        toggleCalibrator() {
            this.calibratorVisible = !this.calibratorVisible;
            const scene = SceneManager._scene;
            if (scene && scene._deusScaleCalibrator) {
                scene._deusScaleCalibrator.visible = this.calibratorVisible;
            }
            return this.calibratorVisible;
        },

        saveOfficialScale(val) {
            const scale = Math.max(0.20, Math.min(2.50, Math.round(Number(val) * 1000) / 1000));
            this.officialScale = scale;
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(STORAGE_KEY, String(scale));
                }
            } catch (e) {}

            const tw = window.$gameMap ? $gameMap.tileWidth() : 48;
            const tilePx = (tw * scale).toFixed(1);
            const cols = window.$gameMap ? $gameMap.screenTileX().toFixed(1) : (Graphics.width / (tw * scale)).toFixed(1);
            const rows = window.$gameMap ? $gameMap.screenTileY().toFixed(1) : (Graphics.height / (tw * scale)).toFixed(1);

            console.log(
                `%c[DEUS Camera] OFFICIAL VIEW SCALE LOCKED: ${scale.toFixed(3)}x (${tilePx}px tiles, ${cols}x${rows} grid)`,
                "color: #34d399; font-weight: bold; font-size: 13px;"
            );

            if (window.UF && UF.Events && UF.Events.emit) {
                UF.Events.emit("camera:officialScaleLocked", scale);
            }
            return scale;
        },

        clearOfficialScale() {
            this.officialScale = null;
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (e) {}
            if (window.UF && UF.Events && UF.Events.emit) {
                UF.Events.emit("camera:officialScaleCleared");
            }
        }
    };

    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Camera = Camera;

    //-------------------------------------------------------------------------
    // Map math: how much of the map is on screen, and mouse -> cell

    const _Game_Map_screenTileX = Game_Map.prototype.screenTileX;
    Game_Map.prototype.screenTileX = function() {
        return _Game_Map_screenTileX.call(this) / Camera.zoom();
    };

    const _Game_Map_screenTileY = Game_Map.prototype.screenTileY;
    Game_Map.prototype.screenTileY = function() {
        return _Game_Map_screenTileY.call(this) / Camera.zoom();
    };

    const _Game_Map_canvasToMapX = Game_Map.prototype.canvasToMapX;
    Game_Map.prototype.canvasToMapX = function(x) {
        return _Game_Map_canvasToMapX.call(this, x / Camera.zoom());
    };

    const _Game_Map_canvasToMapY = Game_Map.prototype.canvasToMapY;
    Game_Map.prototype.canvasToMapY = function(y) {
        return _Game_Map_canvasToMapY.call(this, y / Camera.zoom());
    };

    // Replaced: same as core, but measured in zoomed-out screen space, so events
    // anywhere in the visible area keep running their movement.
    Game_CharacterBase.prototype.isNearTheScreen = function() {
        const z = Camera.zoom();
        const gw = Graphics.width / z;
        const gh = Graphics.height / z;
        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();
        const px = this.scrolledX() * tw + tw / 2 - gw / 2;
        const py = this.scrolledY() * th + th / 2 - gh / 2;
        return px >= -gw && px <= gw && py >= -gh && py <= gh;
    };

    //-------------------------------------------------------------------------
    // Drawing: scale the tilemap (it holds the ground and all character sprites)

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        this.updateUfZoom();
        _Spriteset_Map_update.call(this);
    };

    Spriteset_Map.prototype.updateUfZoom = function() {
        const tilemap = this._tilemap;
        if (!tilemap) return;
        const z = Camera.zoom();
        if (tilemap.scale.x !== z || tilemap.scale.y !== z) tilemap.scale.set(z, z);
        const w = Math.ceil(Graphics.width / z);
        const h = Math.ceil(Graphics.height / z);
        if (tilemap.width !== w || tilemap.height !== h) {
            tilemap.width = w;
            tilemap.height = h;
            tilemap.refresh();
        }
    };

    //-------------------------------------------------------------------------
    // Input Key Mapping

    Input.keyMapper[189] = "ufZoomOut";          // -
    Input.keyMapper[109] = "ufZoomOut";          // numpad -
    Input.keyMapper[187] = "ufZoomIn";           // =
    Input.keyMapper[107] = "ufZoomIn";           // numpad +
    Input.keyMapper[118] = "ufToggleCalibrator";  // F7

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateUfZoomInput();
    };

    Scene_Map.prototype.updateUfZoomInput = function() {
        if (wheelCooldown > 0) wheelCooldown--;
        if (!this.isActive() || $gameMessage.isBusy()) return;

        // F7 toggles Calibrator HUD
        if (Input.isTriggered("ufToggleCalibrator")) {
            Camera.toggleCalibrator();
            SoundManager.playCursor();
        }

        const isShift = (typeof TouchInput._shiftKey !== "undefined" ? TouchInput._shiftKey : false) || Input.isPressed("shift");
        const step = isShift ? 0.01 : 0.05;

        const wheel = wheelCooldown === 0 ? Math.sign(TouchInput.wheelY) : 0;
        if (Input.isTriggered("ufZoomOut") || wheel > 0) {
            if (Camera.zoomOut(step) && wheel) wheelCooldown = WHEEL_COOLDOWN;
        } else if (Input.isTriggered("ufZoomIn") || wheel < 0) {
            if (Camera.zoomIn(step) && wheel) wheelCooldown = WHEEL_COOLDOWN;
        }
    };

    //-------------------------------------------------------------------------
    // Interactive Scale Calibrator HUD Sprite
    //-------------------------------------------------------------------------

    const CAL_W = 320;
    const CAL_H = 186;
    const MIN_W = 144;
    const MIN_H = 26;

    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 1.75;

    const PRESETS = [
        { label: "0.33x", val: 1 / 3, sub: "16px" },
        { label: "0.50x", val: 0.50,  sub: "24px" },
        { label: "0.67x", val: 2 / 3, sub: "32px" },
        { label: "0.75x", val: 0.75,  sub: "36px" },
        { label: "1.00x", val: 1.00,  sub: "48px" },
        { label: "1.25x", val: 1.25,  sub: "60px" },
        { label: "1.50x", val: 1.50,  sub: "72px" }
    ];

    class Sprite_DeusScaleCalibrator extends Sprite {
        constructor() {
            const bmp = new Bitmap(CAL_W, CAL_H);
            super(bmp);
            this.width = CAL_W;
            this.height = CAL_H;
            this.z = 95; // above normal game HUD

            this._minimized = !!Camera.calibratorMinimized;
            this._draggingSlider = false;
            this._draggingWindow = false;
            this._dragOffsetX = 0;
            this._dragOffsetY = 0;
            this._lastZoom = -1;
            this._lastStatusText = "";
            this._statusTimer = 0;

            this.initPosition();
            this.redraw();
        }

        initPosition() {
            if (Camera.calibratorX !== undefined && Camera.calibratorY !== undefined) {
                this.x = Camera.calibratorX;
                this.y = Camera.calibratorY;
            } else {
                const gw = (window.Graphics && (Graphics.width || Graphics.boxWidth)) || 816;
                this.x = Math.max(10, gw - CAL_W - 10);
                this.y = 48; // directly beneath top HUD controls
            }
        }

        update() {
            super.update();
            this.visible = Camera.calibratorVisible;
            if (!this.visible) return;

            const z = Camera.zoom();
            if (z !== this._lastZoom) {
                this.redraw();
            } else if (this._statusTimer > 0) {
                this._statusTimer--;
                if (this._statusTimer === 0) this.redraw();
            }

            this.handleInteraction();
        }

        redraw() {
            const b = this.bitmap;
            b.clear();

            const z = Camera.zoom();
            this._lastZoom = z;

            if (this._minimized) {
                this.setFrame(0, 0, MIN_W, MIN_H);
                b.fillRect(0, 0, MIN_W, MIN_H, "rgba(8, 12, 20, 0.95)");
                b.strokeRect(0, 0, MIN_W, MIN_H, "rgba(56, 189, 248, 0.85)");
                b.fillRect(1, 1, MIN_W - 2, 1, "rgba(160, 240, 255, 0.40)");

                b.fontSize = 12;
                b.fontBold = true;
                b.outlineColor = "rgba(0, 0, 0, 0.95)";
                b.outlineWidth = 3;
                b.textColor = "#38bdf8";
                b.drawText(`🔍 ${z.toFixed(2)}x | Expand`, 6, 2, MIN_W - 12, MIN_H - 4, "center");
                return;
            }

            this.setFrame(0, 0, CAL_W, CAL_H);

            // Background & Border
            b.fillRect(0, 0, CAL_W, CAL_H, "rgba(8, 12, 20, 0.95)");
            b.strokeRect(0, 0, CAL_W, CAL_H, "rgba(56, 189, 248, 0.85)");
            b.fillRect(1, 1, CAL_W - 2, 1, "rgba(160, 240, 255, 0.40)");

            // Title Bar
            b.fillRect(1, 1, CAL_W - 2, 21, "rgba(15, 23, 42, 0.90)");
            b.fontSize = 12;
            b.fontBold = true;
            b.outlineColor = "rgba(0, 0, 0, 0.95)";
            b.outlineWidth = 3;
            b.textColor = "#fbbf24"; // amber gold
            b.drawText("VIEW SCALE CALIBRATOR", 10, 2, 220, 18, "left");

            // Minimize button [_]
            this.drawButton(CAL_W - 24, 2, 20, 18, "—", "#94a3b8", "rgba(30, 41, 59, 0.70)", "rgba(71, 85, 105, 0.50)");

            // Live Metrics Display (Row 1)
            b.fontSize = 15;
            b.fontBold = true;
            b.textColor = "#38bdf8";
            b.drawText(`${z.toFixed(3)}x`, 12, 26, 60, 20, "left");

            const tw = window.$gameMap ? $gameMap.tileWidth() : 48;
            const tilePx = (tw * z).toFixed(1);
            const charPx = (44 * z).toFixed(1);
            const cols = window.$gameMap ? $gameMap.screenTileX().toFixed(1) : (Graphics.width / (tw * z)).toFixed(1);
            const rows = window.$gameMap ? $gameMap.screenTileY().toFixed(1) : (Graphics.height / (tw * z)).toFixed(1);

            b.fontSize = 12;
            b.fontBold = false;
            b.textColor = "#a7f3d0"; // mint green
            b.drawText(`Tile: ${tilePx}px`, 76, 27, 74, 18, "left");

            b.textColor = "#fde047"; // soft yellow
            b.drawText(`Unit: ~${charPx}px`, 152, 27, 78, 18, "left");

            b.textColor = "#cbd5e1"; // slate light
            b.drawText(`${cols}x${rows}`, 234, 27, 76, 18, "right");

            // Stepper & Slider (Row 2)
            // Button [-]
            this.drawButton(8, 50, 26, 20, "−", "#38bdf8");

            // Slider Track
            const trackX = 38, trackY = 56, trackW = 244, trackH = 8;
            b.fillRect(trackX, trackY, trackW, trackH, "rgba(30, 41, 59, 0.95)");
            b.strokeRect(trackX, trackY, trackW, trackH, "rgba(71, 85, 105, 0.70)");

            const ratio = Math.max(0, Math.min(1, (z - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)));
            const fillW = Math.round(ratio * trackW);
            if (fillW > 0) {
                b.fillRect(trackX + 1, trackY + 1, fillW - 1, trackH - 2, "rgba(14, 165, 233, 0.85)");
            }

            // Slider Knob
            const thumbX = Math.round(trackX + ratio * trackW) - 6;
            const thumbY = trackY - 5;
            b.fillRect(thumbX, thumbY, 12, 18, "#ffffff");
            b.strokeRect(thumbX, thumbY, 12, 18, "#38bdf8");
            b.fillRect(thumbX + 5, thumbY + 3, 2, 12, "#0284c7");

            // Button [+]
            this.drawButton(286, 50, 26, 20, "+", "#38bdf8");

            // Quick Preset Buttons (Row 3)
            const presetBtnW = 38;
            const presetGap = 4;
            const startX = 14;
            for (let i = 0; i < PRESETS.length; i++) {
                const p = PRESETS[i];
                const bx = startX + i * (presetBtnW + presetGap);
                const active = Math.abs(z - p.val) < 0.015;
                const bg = active ? "rgba(14, 165, 233, 0.35)" : "rgba(15, 23, 42, 0.75)";
                const border = active ? "#38bdf8" : "rgba(71, 85, 105, 0.50)";
                const textCol = active ? "#ffffff" : "#94a3b8";

                this.drawButton(bx, 76, presetBtnW, 22, p.label, textCol, bg, border, 11);
            }

            // Lock / Canonical Selection Button (Row 4)
            const isOfficial = Camera.officialScale !== null && Math.abs(Camera.officialScale - z) < 0.005;
            if (isOfficial) {
                this.drawButton(
                    12, 106, 296, 28,
                    `✓ OFFICIAL SCALE LOCKED (${z.toFixed(2)}x)`,
                    "#34d399",
                    "rgba(16, 185, 129, 0.25)",
                    "#10b981",
                    12
                );
            } else {
                this.drawButton(
                    12, 106, 296, 28,
                    "★ LOCK AS OFFICIAL VIEW DISTANCE",
                    "#38bdf8",
                    "rgba(2, 132, 199, 0.25)",
                    "#0284c7",
                    12
                );
            }

            // Status & Instructions (Row 5)
            if (this._statusTimer > 0) {
                b.fontSize = 11;
                b.fontBold = true;
                b.textColor = "#34d399";
                b.drawText(this._lastStatusText, 12, 142, 296, 16, "center");
            } else {
                b.fontSize = 11;
                b.fontBold = false;
                b.textColor = "#64748b";
                b.drawText("Drag slider • Click presets • Drag header to move", 12, 140, 296, 16, "center");
                b.drawText("F7: Toggle HUD • Wheel / [ - ][ = ]: Zoom • Shift: fine", 12, 156, 296, 16, "center");
            }
        }

        drawButton(x, y, w, h, label, textColor = "#38bdf8", bgColor = "rgba(18, 26, 42, 0.90)", borderColor = "rgba(56, 189, 248, 0.65)", fontSize = 13) {
            const b = this.bitmap;
            b.fillRect(x, y, w, h, bgColor);
            b.strokeRect(x, y, w, h, borderColor);
            b.fillRect(x + 1, y + 1, w - 2, 1, "rgba(255, 255, 255, 0.20)");
            b.fontSize = fontSize;
            b.fontBold = true;
            b.outlineColor = "rgba(0, 0, 0, 0.95)";
            b.outlineWidth = 3;
            b.textColor = textColor;
            b.drawText(label, x, y, w, h, "center");
        }

        handleInteraction() {
            const mx = TouchInput.x;
            const my = TouchInput.y;
            const lx = mx - this.x;
            const ly = my - this.y;
            const w = this._minimized ? MIN_W : CAL_W;
            const h = this._minimized ? MIN_H : CAL_H;
            const isOver = lx >= 0 && lx < w && ly >= 0 && ly < h;

            // Handle Dragging Window by Header
            if (TouchInput.isTriggered() && isOver) {
                if (this._minimized) {
                    // Click to un-minimize
                    this._minimized = false;
                    Camera.calibratorMinimized = false;
                    this.redraw();
                    SoundManager.playOk();
                    TouchInput.clear();
                    return;
                } else if (ly >= 0 && ly <= 22) {
                    if (lx >= CAL_W - 24 && lx <= CAL_W - 4) {
                        // Minimize button
                        this._minimized = true;
                        Camera.calibratorMinimized = true;
                        this.redraw();
                        SoundManager.playCancel();
                        TouchInput.clear();
                        return;
                    } else {
                        // Grab header to drag window
                        this._draggingWindow = true;
                        this._dragOffsetX = lx;
                        this._dragOffsetY = ly;
                    }
                }
            }

            if (this._draggingWindow) {
                if (TouchInput.isPressed()) {
                    const gw = (window.Graphics && (Graphics.width || Graphics.boxWidth)) || 816;
                    const gh = (window.Graphics && (Graphics.height || Graphics.boxHeight)) || 624;
                    this.x = Math.max(0, Math.min(gw - w, mx - this._dragOffsetX));
                    this.y = Math.max(0, Math.min(gh - h, my - this._dragOffsetY));
                    Camera.calibratorX = this.x;
                    Camera.calibratorY = this.y;
                    TouchInput.clear();
                    return;
                } else {
                    this._draggingWindow = false;
                }
            }

            if (this._minimized) return;

            // Handle Slider Dragging
            const trackX = 38, trackW = 244;
            if (TouchInput.isTriggered() && lx >= trackX - 6 && lx <= trackX + trackW + 6 && ly >= 46 && ly <= 72) {
                this._draggingSlider = true;
            }

            if (this._draggingSlider) {
                if (TouchInput.isPressed()) {
                    const norm = Math.max(0, Math.min(1, (TouchInput.x - (this.x + trackX)) / trackW));
                    const newZ = MIN_ZOOM + norm * (MAX_ZOOM - MIN_ZOOM);
                    Camera.setZoom(newZ);
                    TouchInput.clear();
                    return;
                } else {
                    this._draggingSlider = false;
                }
            }

            // Handle Button Clicks
            if (TouchInput.isTriggered() && isOver) {
                const isShift = (typeof TouchInput._shiftKey !== "undefined" ? TouchInput._shiftKey : false) || Input.isPressed("shift");
                const step = isShift ? 0.01 : 0.05;

                // [-] Stepper button
                if (lx >= 8 && lx <= 34 && ly >= 50 && ly <= 70) {
                    Camera.zoomOut(step);
                    SoundManager.playCursor();
                    TouchInput.clear();
                    return;
                }

                // [+] Stepper button
                if (lx >= 286 && lx <= 312 && ly >= 50 && ly <= 70) {
                    Camera.zoomIn(step);
                    SoundManager.playCursor();
                    TouchInput.clear();
                    return;
                }

                // Preset Buttons
                const presetBtnW = 38;
                const presetGap = 4;
                const startX = 14;
                if (ly >= 76 && ly <= 98) {
                    for (let i = 0; i < PRESETS.length; i++) {
                        const bx = startX + i * (presetBtnW + presetGap);
                        if (lx >= bx && lx < bx + presetBtnW) {
                            Camera.setZoom(PRESETS[i].val);
                            SoundManager.playCursor();
                            TouchInput.clear();
                            return;
                        }
                    }
                }

                // Lock as Official Scale Button
                if (lx >= 12 && lx <= 308 && ly >= 106 && ly <= 134) {
                    const z = Camera.zoom();
                    Camera.saveOfficialScale(z);
                    this._lastStatusText = `✓ Saved: ${z.toFixed(3)}x locked as official view distance!`;
                    this._statusTimer = 240; // 4 seconds at 60 fps
                    this.redraw();
                    SoundManager.playSave();
                    TouchInput.clear();
                    return;
                }

                // Clicked elsewhere on calibrator body: consume touch
                TouchInput.clear();
            }
        }
    }

    Camera.CalibratorSprite = Sprite_DeusScaleCalibrator;

    // Attach Calibrator to Scene_Map
    const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);
        this._deusScaleCalibrator = new Sprite_DeusScaleCalibrator();
        this.addChild(this._deusScaleCalibrator);
    };

    // Block map interaction when hovering over Calibrator
    const _Scene_Map_isAnyWindowUnderMouse = Scene_Map.prototype.isAnyWindowUnderMouse;
    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        if (_Scene_Map_isAnyWindowUnderMouse && _Scene_Map_isAnyWindowUnderMouse.call(this)) return true;
        const c = this._deusScaleCalibrator;
        if (c && c.visible) {
            const w = c._minimized ? MIN_W : CAL_W;
            const h = c._minimized ? MIN_H : CAL_H;
            if (TouchInput.x >= c.x && TouchInput.x < c.x + w && TouchInput.y >= c.y && TouchInput.y < c.y + h) {
                return true;
            }
        }
        return false;
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "camera")

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("camera", async t => {
            // Look at the glade, so the screenshots show something
            if (UF.World && UF.World.state && UF.World.currentArea && UF.World.isStartArea && UF.World.isStartArea(UF.World.currentArea().x, UF.World.currentArea().y)) {
                const off = UF.World.templateOffset();
                $gamePlayer.locate(off.x + 15, off.y + 16);
                await t.waitFrames(5);
            }

            const base = Math.round((Graphics.width / $gameMap.tileWidth()) * 16) / 16;
            t.check("levels", LEVELS[0] === 1 && LEVELS.length >= 2,
                `levels ${LEVELS.map(z => z.toFixed(3)).join(", ")}; start level ${START} = zoom ${LEVELS[START].toFixed(3)}`);
            t.check("starts_zoomed_out", Camera.level() === START && START > 0, `current level ${Camera.level()} (zoom ${Camera.zoom().toFixed(3)})`);

            // Verify original discrete levels
            const cellsSeen = [];
            for (let i = 0; i < LEVELS.length; i++) {
                Camera.setLevel(i);
                await t.waitFrames(10);
                const z = Camera.zoom();
                const tilemap = SceneManager._scene._spriteset._tilemap;
                const cols = $gameMap.screenTileX(), rows = $gameMap.screenTileY();
                cellsSeen.push(cols * rows);
                t.check(`level_${i}_view`,
                    Math.abs(cols - base / z) < 0.01 && Math.abs(tilemap.scale.x - z) < 1e-9 && tilemap.width === Math.ceil(Graphics.width / z),
                    `zoom ${z.toFixed(3)}: ${cols.toFixed(2)} x ${rows.toFixed(2)} cells visible; tilemap ${tilemap.width}x${tilemap.height} at scale ${tilemap.scale.x.toFixed(3)}`);

                const mx = $gameMap.canvasToMapX(Graphics.width / 2), my = $gameMap.canvasToMapY(Graphics.height / 2);
                const ex = $gameMap.roundX(Math.floor($gameMap.displayX() + Graphics.width / 2 / z / $gameMap.tileWidth()));
                const ey = $gameMap.roundY(Math.floor($gameMap.displayY() + Graphics.height / 2 / z / $gameMap.tileHeight()));
                t.check(`level_${i}_mouse`, mx === ex && my === ey, `canvas centre -> cell (${mx},${my}), expected (${ex},${ey})`);
                t.screenshot(`zoom_${i}`);
            }
            t.check("zoom_out_shows_more", cellsSeen.every((n, i) => i === 0 || n > cellsSeen[i - 1]),
                `cells on screen per level: ${cellsSeen.map(n => Math.round(n)).join(" < ")}`);

            // Check Calibrator HUD existence
            const scene = SceneManager._scene;
            const cal = scene && scene._deusScaleCalibrator;
            t.check("calibrator_hud_exists", !!cal && cal instanceof Sprite_DeusScaleCalibrator, "Scale Calibrator HUD sprite is instantiated");
            t.check("calibrator_hud_visible", !!cal && cal.visible, "Scale Calibrator HUD sprite is visible");

            // Check Continuous Zoom (0.75x)
            Camera.setZoom(0.75);
            await t.waitFrames(5);
            const zCustom = Camera.zoom();
            t.check("continuous_zoom_set", Math.abs(zCustom - 0.75) < 0.001, `continuous zoom set to ${zCustom.toFixed(3)}`);
            const tilemapCustom = scene._spriteset._tilemap;
            t.check("continuous_tilemap_scale", Math.abs(tilemapCustom.scale.x - 0.75) < 1e-9, `tilemap scale is ${tilemapCustom.scale.x.toFixed(3)}`);

            // Check Official Scale Persistence
            Camera.saveOfficialScale(0.75);
            t.check("official_scale_persisted", Camera.officialScale === 0.75, "Camera.officialScale updated to 0.75");

            // Check Mouse Click Isolation
            if (cal) {
                TouchInput._x = cal.x + 20;
                TouchInput._y = cal.y + 20;
                t.check("calibrator_blocks_map_clicks", scene.isAnyWindowUnderMouse() === true, "isAnyWindowUnderMouse is true over calibrator");
            }

            t.screenshot("calibrator_hud");

            // Cleanup: clear official scale from test and restore default level
            Camera.clearOfficialScale();
            Camera.setLevel(START);
            await t.waitFrames(5);
        });
    }
})();
