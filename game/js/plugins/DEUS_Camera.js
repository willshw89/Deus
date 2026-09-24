//=============================================================================
// DEUS_Camera.js - Fixed 1.0x canonical view scale & pixel-exact camera navigation
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Camera] Fixed 1.0x canonical view scale (48px tiles, FF5 chibi scale) with zoom feature retired.
 * @author DEUS project
 * @orderAfter DEUS_ColonyOverseer
 *
 * @help
 * Camera View Scale:
 * - Locked permanently to 1.0x (native 1x scale, 48px tiles).
 * - Zoom controls, dynamic scaling, and in-game calibrator are retired.
 *
 * API:
 *   UF.Camera.zoom()          -> always returns 1.0
 *   UF.Camera.level()         -> always returns 0
 *   UF.Camera.officialScale   -> 1.0
 *
 * Replaced core methods: Game_CharacterBase.isNearTheScreen (zoom-aware, 1x).
 */

(() => {
    "use strict";

    const STORAGE_KEY = "deus_canonical_view_scale";
    try {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(STORAGE_KEY, "1.000");
        }
    } catch (e) {}

    const Camera = {
        levels: [1],
        officialScale: 1.0,
        calibratorVisible: false,

        /** Returns current active zoom scale (locked to 1.0) */
        zoom: () => 1.0,

        /** Returns current level index (0 = 1.0x) */
        level: () => 0,

        /** No-op: zoom is locked to 1.0 */
        setLevel: () => false,

        /** No-op: zoom is locked to 1.0 */
        setZoom: () => false,

        zoomOut: () => false,
        zoomIn: () => false,
        toggleCalibrator: () => false,
        saveOfficialScale: () => 1.0,
        clearOfficialScale: () => {}
    };

    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Camera = Camera;

    //-------------------------------------------------------------------------
    // Map math: standard 1.0x screen metrics and canvas-to-map mapping

    const _Game_Map_screenTileX = Game_Map.prototype.screenTileX;
    Game_Map.prototype.screenTileX = function() {
        return _Game_Map_screenTileX.call(this);
    };

    const _Game_Map_screenTileY = Game_Map.prototype.screenTileY;
    Game_Map.prototype.screenTileY = function() {
        return _Game_Map_screenTileY.call(this);
    };

    const _Game_Map_canvasToMapX = Game_Map.prototype.canvasToMapX;
    Game_Map.prototype.canvasToMapX = function(x) {
        return _Game_Map_canvasToMapX.call(this, x);
    };

    const _Game_Map_canvasToMapY = Game_Map.prototype.canvasToMapY;
    Game_Map.prototype.canvasToMapY = function(y) {
        return _Game_Map_canvasToMapY.call(this, y);
    };

    Game_CharacterBase.prototype.isNearTheScreen = function() {
        const gw = Graphics.width;
        const gh = Graphics.height;
        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();
        const px = this.scrolledX() * tw + tw / 2 - gw / 2;
        const py = this.scrolledY() * th + th / 2 - gh / 2;
        return px >= -gw && px <= gw && py >= -gh && py <= gh;
    };

    //-------------------------------------------------------------------------
    // Drawing: ensure tilemap is strictly 1.0 scale

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        this.updateUfZoom();
        _Spriteset_Map_update.call(this);
    };

    Spriteset_Map.prototype.updateUfZoom = function() {
        const tilemap = this._tilemap;
        if (!tilemap) return;
        if (tilemap.scale.x !== 1 || tilemap.scale.y !== 1) {
            tilemap.scale.set(1, 1);
        }
        const w = Graphics.width;
        const h = Graphics.height;
        if (tilemap.width !== w || tilemap.height !== h) {
            tilemap.width = w;
            tilemap.height = h;
            tilemap.refresh();
        }
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
            // Locate player so view is stable
            if (UF.World && UF.World.state && UF.World.currentArea && UF.World.isStartArea && UF.World.isStartArea(UF.World.currentArea().x, UF.World.currentArea().y)) {
                const off = UF.World.templateOffset();
                $gamePlayer.locate(off.x + 15, off.y + 16);
                await t.waitFrames(5);
            }

            // 1. Verify zoom is locked at 1.0
            t.check("zoom_locked_at_1x", Camera.zoom() === 1.0, `Camera.zoom() is ${Camera.zoom()} (locked at 1.0)`);
            t.check("camera_level_0", Camera.level() === 0, `Camera.level() is ${Camera.level()}`);

            // 2. Verify zoom mutations are rejected
            const setLevelResult = Camera.setLevel(1);
            t.check("setLevel_rejected", setLevelResult === false && Camera.zoom() === 1.0, "Camera.setLevel is rejected/no-op");
            const setZoomResult = Camera.setZoom(0.5);
            t.check("setZoom_rejected", setZoomResult === false && Camera.zoom() === 1.0, "Camera.setZoom is rejected/no-op");

            // 3. Verify tilemap scale is strictly 1.0
            const scene = SceneManager._scene;
            const tilemap = scene && scene._spriteset && scene._spriteset._tilemap;
            t.check("tilemap_scale_1x", !!tilemap && tilemap.scale.x === 1 && tilemap.scale.y === 1,
                `tilemap scale is ${tilemap ? tilemap.scale.x : "null"}`);

            // 4. Verify screen metrics at 1x
            const expectedCols = Math.round((Graphics.width / $gameMap.tileWidth()) * 16) / 16;
            t.check("screen_cols_1x", Math.abs($gameMap.screenTileX() - expectedCols) < 0.01,
                `screenTileX is ${$gameMap.screenTileX()} (expected ${expectedCols})`);

            // 5. Verify mouse mapping at 1x
            const mx = $gameMap.canvasToMapX(Graphics.width / 2), my = $gameMap.canvasToMapY(Graphics.height / 2);
            const ex = $gameMap.roundX(Math.floor($gameMap.displayX() + Graphics.width / 2 / $gameMap.tileWidth()));
            const ey = $gameMap.roundY(Math.floor($gameMap.displayY() + Graphics.height / 2 / $gameMap.tileHeight()));
            t.check("mouse_mapping_1x", mx === ex && my === ey, `canvas center -> cell (${mx},${my}), expected (${ex},${ey})`);

            // 6. Verify calibrator HUD is retired
            const cal = scene && scene._deusScaleCalibrator;
            t.check("calibrator_retired", !cal || !cal.visible, "calibrator HUD is retired/invisible");

            t.screenshot("locked_1x");
            await t.waitFrames(5);
        });
    }

    // Dynamically load DEUS_Minimap if not already loaded
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || (!PluginManager._scripts.includes("DEUS_Minimap") && !PluginManager._scripts.includes("DEUS_Minimap.js"))) {
            PluginManager.loadScript("DEUS_Minimap");
        }
    }
})();

