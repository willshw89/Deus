//=============================================================================
// DEUS_Camera.js - Zoom the map view out and in, in pixel-exact steps
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Camera] Pixel-exact camera zoom controls, smooth panning navigation, and entity target tracking.
 * @author UF project
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
 * Zoom out: mouse wheel down, "-" or numpad "-".
 * Zoom in:  mouse wheel up, "=" or numpad "+".
 * The view stays centered on the same map point while zooming.
 *
 * How it works: the map's tilemap (which also holds every character sprite)
 * is scaled down and drawn wider/taller, and RMMZ's screen-size and
 * mouse-to-map math is divided by the zoom. The UI isn't scaled.
 *
 * API and checks: docs/systems/UF_Camera.md
 *
 * Replaced core methods: Game_CharacterBase.isNearTheScreen (same formula,
 * zoom-aware). Everything else is aliased.
 */

(() => {
    "use strict";

    const P = (PluginManager.parameters("DEUS_Camera") && Object.keys(PluginManager.parameters("DEUS_Camera")).length ? PluginManager.parameters("DEUS_Camera") : PluginManager.parameters("UF_Camera"));
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
    const WHEEL_COOLDOWN = 12; // frames; touchpads send many small wheel events per gesture

    let index = START;
    let wheelCooldown = 0;

    const Camera = {
        levels: LEVELS.slice(),
        zoom: () => LEVELS[index],
        level: () => index,
        /** Set the zoom by level index (0 = closest). Keeps the view centered. Returns true if it changed. */
        setLevel(i) {
            i = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
            if (i === index) return false;
            const onMap = window.$gameMap && $gameMap.mapId() > 0 && $dataMap;
            const cx = onMap ? $gameMap.displayX() + $gameMap.screenTileX() / 2 : 0;
            const cy = onMap ? $gameMap.displayY() + $gameMap.screenTileY() / 2 : 0;
            index = i;
            if (onMap) $gameMap.setDisplayPos(cx - $gameMap.screenTileX() / 2, cy - $gameMap.screenTileY() / 2);
            if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit("camera:zoomChanged", LEVELS[index]);
            return true;
        },
        zoomOut() { return this.setLevel(index + 1); },
        zoomIn() { return this.setLevel(index - 1); }
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
    // Input

    Input.keyMapper[189] = "ufZoomOut"; // -
    Input.keyMapper[109] = "ufZoomOut"; // numpad -
    Input.keyMapper[187] = "ufZoomIn";  // =
    Input.keyMapper[107] = "ufZoomIn";  // numpad +

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateUfZoomInput();
    };

    Scene_Map.prototype.updateUfZoomInput = function() {
        if (wheelCooldown > 0) wheelCooldown--;
        if (!this.isActive() || $gameMessage.isBusy()) return;
        const wheel = wheelCooldown === 0 ? Math.sign(TouchInput.wheelY) : 0;
        if (Input.isTriggered("ufZoomOut") || wheel > 0) {
            if (Camera.zoomOut() && wheel) wheelCooldown = WHEEL_COOLDOWN;
        } else if (Input.isTriggered("ufZoomIn") || wheel < 0) {
            if (Camera.zoomIn() && wheel) wheelCooldown = WHEEL_COOLDOWN;
        }
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "camera"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("camera", async t => {
            // Look at the glade, so the screenshots show something (other suites may have moved the view).
            if (UF.World && UF.World.state && UF.World.currentArea() && UF.World.isStartArea(UF.World.currentArea().x, UF.World.currentArea().y)) {
                const off = UF.World.templateOffset();
                $gamePlayer.locate(off.x + 15, off.y + 16);
                await t.waitFrames(5);
            }
            const base = Math.round((Graphics.width / $gameMap.tileWidth()) * 16) / 16;
            t.check("levels", LEVELS[0] === 1 && LEVELS.length >= 2,
                `levels ${LEVELS.map(z => z.toFixed(3)).join(", ")}; start level ${START} = zoom ${LEVELS[START].toFixed(3)}`);
            t.check("starts_zoomed_out", Camera.level() === START && START > 0, `current level ${Camera.level()} (zoom ${Camera.zoom().toFixed(3)})`);
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
                // The mouse at the canvas centre must map to the cell drawn there.
                const mx = $gameMap.canvasToMapX(Graphics.width / 2), my = $gameMap.canvasToMapY(Graphics.height / 2);
                const ex = $gameMap.roundX(Math.floor($gameMap.displayX() + Graphics.width / 2 / z / $gameMap.tileWidth()));
                const ey = $gameMap.roundY(Math.floor($gameMap.displayY() + Graphics.height / 2 / z / $gameMap.tileHeight()));
                t.check(`level_${i}_mouse`, mx === ex && my === ey, `canvas centre -> cell (${mx},${my}), expected (${ex},${ey})`);
                t.screenshot(`zoom_${i}`);
            }
            t.check("zoom_out_shows_more", cellsSeen.every((n, i) => i === 0 || n > cellsSeen[i - 1]),
                `cells on screen per level: ${cellsSeen.map(n => Math.round(n)).join(" < ")}`);
            Camera.setLevel(START);
            await t.waitFrames(5);
        });
    }
})();
