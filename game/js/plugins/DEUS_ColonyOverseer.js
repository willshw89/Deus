//=============================================================================
// DEUS_ColonyOverseer.js - The overseer's view: free camera, colonist selection, the colonist card
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS ColonyOverseer] Real-time colony simulation, unit selection cards, order issuance, designation markers, and speed controls.
 * @author UF project
 *
 * @param EdgePanSpeed
 * @text Edge Pan Camera Speed
 * @type number
 * @min 0
 * @max 48
 * @default 6
 * @desc Map pixels per frame the view pans while the pointer rests at a viewport edge. 0 = off. 6 = 0.125 cells/frame at 48 px tiles.
 *
 * @param EdgePanEnabled
 * @text Edge Panning
 * @type boolean
 * @on Enabled
 * @off Disabled
 * @default true
 * @desc Pan the view when the pointer rests at a viewport edge. Off keeps WASD / arrow-key panning only.
 *
 * @help
 * The player is an overseer, not a character on the map (VISION V4):
 * - WASD and the arrow keys pan the camera; the protagonist is invisible and
 *   never walks;
 * - edge panning (2026-10-07): the pointer resting within 16 px of a viewport
 *   edge pans the VIEW in that direction (corners pan diagonally); it never
 *   moves the player or a unit. See "Edge panning" below;
 * - left-click on a colonist selects it and opens its card; left-click on the
 *   ground with a colonist selected orders it there (UF.Colonists.order, a
 *   "move" job); right-click deselects (unless UF_Interact opened its menu);
 * - the card shows name, gender, mood, faction and home site, the current
 *   job (UF.Jobs.describe), what it carries ("Carrying 3 logs to the
 *   woodpile", from UF.Sheet.loadOf; VISION V89: loads are written in the
 *   profile, never drawn on the sprite), hunger / thirst / sleep / social, the
 *   tool and the clothes worn, the latest thought, and the society plan's
 *   progress.
 *
 * The colonists themselves (needs, decisions, plan, thoughts) are UF_Colonists
 * (2026-09-18: the old Colonist class, needs ticker and glade setup were
 * removed from here). window.$colonyManager stays as a thin adapter over
 * UF.Colonists for older callers.
 *
 * API and checks: docs/systems/UF_ColonyOverseer.md
 *
 * Edge panning (parameters EdgePanEnabled / EdgePanSpeed):
 * - Unit: EdgePanSpeed is MAP PIXELS PER FRAME, the unit the parameter was
 *   first documented with ("pixels per frame when mouse is near screen edge").
 *   It is converted to the engine scroll contract's unit, map cells per frame,
 *   by dividing by the tile size: cells/frame = EdgePanSpeed / tileWidth()
 *   (tileHeight() for the vertical axis). Default 6 => 6 / 48 = 0.125 cells
 *   per frame (7.5 cells per second at 60 fps). The keyboard pan keeps its own
 *   CAM_SPEED of 0.35 cells per frame (16.8 map px at 48 px tiles); while a
 *   pan key is held the keyboard pans alone, so WASD speed never changes.
 *   Like WASD the speed is in map cells, so at 2x zoom the view covers twice
 *   the screen pixels per frame and at 0.5x half; both pans scale together.
 * - Validation: a missing or blank value, a non-number or a negative value
 *   falls back to 6; values above 48 (one cell per frame) clamp to 48; 0
 *   turns edge panning off, as does EdgePanEnabled = false. The runtime API
 *   validates the same way.
 * - The view scrolls through $gameMap.scrollLeft/Right/Up/Down, the engine's
 *   owning contract, so looping maps wrap and non-looping maps stop at their
 *   bounds (zoom-aware through DEUS_Camera's screenTileX/Y).
 * - It pans only with an actual pointer: the position TouchInput reports must
 *   be the position of a real mouse/touch event this plugin observed and that
 *   position must be inside the canvas. Held press (2026-10-07): while
 *   TouchInput.isPressed(), the engine's _onMove keeps the press origin until
 *   the drag exceeds TouchInput.moveThreshold (10 px) on an axis, so within
 *   that threshold TouchInput lags the observed pointer by design; the
 *   pointer still counts as observed and the pan reads its observed position
 *   (a held pointer moved 1-10 px keeps panning). A larger difference, or any
 *   difference without a held press, never pans. The engine's start-up
 *   origin (0,0), TouchInput.clear() (focus loss, consumed HUD clicks) and
 *   check-driven or replayed TouchInput._x/_y never pan. Mouse-out of the
 *   window, window blur, touch end/cancel and a hidden page stop it until the
 *   next real pointer event inside the canvas.
 * - It pauses while UI owns the pointer: Scene_Map.isAnyWindowUnderMouse
 *   (the card, ledger, chronicle, container card, sheet panel, zoom slider,
 *   time and level controls through their aliases), DEUS.Look.isOverUI and
 *   DEUS.Select.pointerOverUI (open windows of the window layer and the
 *   scene; a talk counts as whole-screen UI), the bag window, an open
 *   DEUS.Interact context menu, DEUS.Talk, an attached or dragged
 *   DEUS.ItemDrag item, and a busy $gameMessage. Overseer mode off pauses it.
 *   Those predicates test TouchInput's position; during the held-press lag
 *   above that is the press origin (the position UI consumers act on), so
 *   the pan then also requires the same UI, read from the scene's own window
 *   and HUD frames (edgePanUIAt), to be absent under the observed pointer:
 *   a press beside the zoom slider that slides onto it pauses the pan, and
 *   TouchInput's press origin and threshold stay the engine's (2026-10-07).
 * - Panning the view by edge releases $colonyManager.cameraFollowUnit, as a
 *   keyboard pan does.
 * - API (DEUS.Overseer.edgePan): enabled(), setEnabled(bool), toggle(),
 *   speed() -> map px per frame, setSpeed(px) -> applied value,
 *   cellsPerFrame() -> { x, y }, parseSpeed(raw), parseEnabled(raw),
 *   vector(x, y) -> { dx, dy } in -1/0/1 for a canvas position,
 *   notePointer(x, y) / notePointerGone() (what the TouchInput aliases call),
 *   pointer() -> { seen, inside, x, y }, blockReason(scene) -> "" or why it
 *   does not pan now, step(scene) -> { dx, dy } panned this frame or null,
 *   lastStep(), MARGIN (16 px), MAX_SPEED (48), DEFAULT_SPEED (6). The
 *   runtime toggle and speed are view state, not saved.
 * - Checks: suite "overseer" (edge_pan_moves_view, edge_pan_pauses).
 *
 * Replaced core methods (not aliased): Game_Player.prototype.moveByInput (no
 * protagonist walking), Game_Player.prototype.updateScroll (the camera
 * follows a chosen unit or stays free), Scene_Map.prototype.createMenuButton,
 * Scene_Map.prototype.isMenuEnabled, Scene_Map.prototype.callMenu (no menu),
 * Scene_Map.prototype.processMapTouch (clicks are orders, not walking),
 * Window_MapName.prototype.open (no map name banner),
 * Sprite_Destination.prototype.update (no click pulse).
 */

(() => {
    "use strict";


    const CAM_SPEED = 0.35;   // cells per frame while a pan key is held

    //-----------------------------------------------------------------------------
    // Edge panning settings (EdgePanEnabled / EdgePanSpeed; see the header for the unit)

    const EDGE_PAN_MARGIN = 16;        // canvas px from an edge that count as "at the edge"
    const EDGE_PAN_DEFAULT_SPEED = 6;  // map px per frame (the parameter's documented unit)
    const EDGE_PAN_MAX_SPEED = 48;     // one cell per frame at 48 px tiles

    /** Map px per frame from a raw parameter / API value: blank, non-number or negative -> default; above the cap -> cap. */
    function parseEdgePanSpeed(raw) {
        if (raw === undefined || raw === null || String(raw).trim() === "") return EDGE_PAN_DEFAULT_SPEED;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return EDGE_PAN_DEFAULT_SPEED;
        return Math.min(EDGE_PAN_MAX_SPEED, n);
    }
    /** true unless the raw value reads as "false" / 0 (a missing value keeps edge panning on). */
    function parseEdgePanEnabled(raw) {
        if (raw === undefined || raw === null || String(raw).trim() === "") return true;
        const s = String(raw).trim().toLowerCase();
        return !(s === "false" || s === "0" || s === "off" || s === "no");
    }
    function overseerParams() {
        if (typeof PluginManager === "undefined" || typeof PluginManager.parameters !== "function") return {};
        const p = PluginManager.parameters("DEUS_ColonyOverseer");
        if (p && Object.keys(p).length) return p;
        return PluginManager.parameters("UF_ColonyOverseer") || {};
    }
    const edgePanParams = overseerParams();
    let edgePanEnabled = parseEdgePanEnabled(edgePanParams.EdgePanEnabled);
    let edgePanSpeed = parseEdgePanSpeed(edgePanParams.EdgePanSpeed);

    // The last real pointer event this plugin observed (canvas px). TouchInput._x/_y alone are not evidence of a
    // pointer: they start at (0,0), clear() resets them there, and checks/replays write them directly. While a press
    // is held they also lag this record by up to TouchInput.moveThreshold per axis (the engine's press-origin rule,
    // see edgePointerWithinHeldPressThreshold).
    const edgePointer = { seen: false, inside: false, x: -1, y: -1 };
    let edgePanLast = null;

    function insideCanvas(x, y) {
        if (typeof Graphics !== "undefined" && typeof Graphics.isInsideCanvas === "function") return Graphics.isInsideCanvas(x, y);
        return typeof Graphics !== "undefined" && x >= 0 && x < Graphics.width && y >= 0 && y < Graphics.height;
    }
    function notePointer(x, y) {
        if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return;
        edgePointer.seen = true;
        edgePointer.x = x;
        edgePointer.y = y;
        edgePointer.inside = insideCanvas(x, y);
    }
    function notePointerGone() {
        edgePointer.inside = false;
    }
    const CARD_W = 380, CARD_H = 240;
    const LOAD_Y = 60;        // the load line ("Carrying 3 logs to the woodpile"), under the job; blank when it carries nothing
    const BELOW_LOAD = 22;    // everything under the load line moved down by this much (2026-09-19, V89)
    const CARD_REFRESH = 30;  // frames between card refreshes while it's open

    let activeColonyWindow = null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const World = () => (window.UF && UF.World) || null;

    //-----------------------------------------------------------------------------
    // $colonyManager: an adapter over UF.Colonists for the older callers (UF_Construction, UF_Fog, UF_Stance)

    const adapters = new Map(); // unit id -> adapter (stable identity, so selections compare by object)
    function adapterFor(unit) {
        let a = adapters.get(unit.id);
        if (a) return a;
        a = {
            id: unit.id,
            drafted: false,
            get unit() { return World() ? World().unit(unit.id) : null; },
            get name() { return this.unit ? this.unit.name : ""; },
            get gender() { const u = this.unit; return u && u.data && u.data.gender ? u.data.gender.charAt(0).toUpperCase() + u.data.gender.slice(1) : ""; },
            get mood() { return "Fine"; },
            get hunger() { return 0; },
            get thirst() { return 0; },
            get fatigue() { return 0; },
            get social() { return 0; },
            get visionRadius() { const u = this.unit; return u && u.data && u.data.sight ? u.data.sight : 8; },
            get thoughts() { return []; },
            get currentJob() {
                const J = Jobs();
                const j = J ? J.of(unit.id) : null;
                return j ? J.describe(j) : "Idle";
            },
            set currentJob(v) { /* older callers wrote "Idle" here; jobs are UF_Jobs' now */ },
            get event() { return World() ? World().eventOf(unit.id) : null; },
            assignMoveTo(x, y, onArrival) {
                const C = Colonists();
                return C ? C.order(unit.id, { type: "move", target: { x, y } }, onArrival) : null;
            },
            addThought(text, strength) {
                const C = Colonists();
                if (C && this.unit) C.addThought(this.unit, text, strength);
            }
        };
        adapters.set(unit.id, a);
        return a;
    }

    class ColonyManager {
        constructor() {
            this.selectedColonist = null;
            this.cameraFollowUnit = null;
            this.isOverseerMode = true;
        }
        get colonists() {
            const C = Colonists();
            return C ? C.list().map(adapterFor) : [];
        }
        /** { steps: [{ id, done, detail }], text: "Hearth: built · Knives: 1/6 · ..." } */
        get societyProgress() {
            const C = Colonists();
            return C ? { steps: C.planStatus(), text: C.planText() } : { steps: [], text: "" };
        }
        select(colonist) {
            this.selectedColonist = colonist && typeof colonist === "number" ? this.colonists.find(c => c.id === colonist) || null : colonist;
            if (activeColonyWindow) {
                if (this.selectedColonist) {
                    activeColonyWindow.refresh();
                    activeColonyWindow.show();
                } else {
                    activeColonyWindow.hide();
                }
            }
            if (this.selectedColonist) {
                if (window.UF && UF.Sheet && typeof UF.Sheet.open === "function") {
                    UF.Sheet.open(this.selectedColonist.id);
                }
            }
        }
        deselect(options = {}) {
            const wasColonist = this.selectedColonist;
            this.selectedColonist = null;
            if (window.UF && UF.Target && typeof UF.Target.clearTargetedTile === "function") {
                UF.Target.clearTargetedTile();
            }
            if (activeColonyWindow) activeColonyWindow.hide();
            if (!options || !options.keepSheet) {
                if (window.UF && UF.Sheet && typeof UF.Sheet.close === "function") {
                    const sub = UF.Sheet.subject ? UF.Sheet.subject() : null;
                    if (!sub || (sub.kind === "unit" && wasColonist && sub.unitId === wasColonist.id)) {
                        UF.Sheet.close();
                    }
                }
            }
        }
    }
    window.$colonyManager = new ColonyManager();

    //-----------------------------------------------------------------------------
    // Keyboard & mouse: the free overseer camera

    Input.keyMapper[87] = "cameraUp";    // W
    Input.keyMapper[65] = "cameraLeft";  // A
    Input.keyMapper[83] = "cameraDown";  // S
    Input.keyMapper[68] = "cameraRight"; // D
    Input.keyMapper[37] = "cameraLeft";  // Left Arrow
    Input.keyMapper[38] = "cameraUp";    // Up Arrow
    Input.keyMapper[39] = "cameraRight"; // Right Arrow
    Input.keyMapper[40] = "cameraDown";  // Down Arrow

    // No protagonist: directional input pans the camera instead of walking anyone.
    Game_Player.prototype.moveByInput = function() {};

    // No RMMZ menu, no touch menu button.
    Scene_Map.prototype.createMenuButton = function() {};
    Scene_Map.prototype.isMenuEnabled = function() { return false; };
    Scene_Map.prototype.callMenu = function() {};

    // No map name banner. The window must still be created: Scene_Map.stop/start/launchBattle call it.
    Window_MapName.prototype.open = function() {};

    // No click destination pulse on the ground, and clicks never walk the (invisible) player.
    Sprite_Destination.prototype.update = function() {
        this.visible = false;
    };
    Scene_Map.prototype.processMapTouch = function() {};

    //-----------------------------------------------------------------------------
    // Edge panning: actual pointer presence (aliases run before the engine's handlers, which keep their behavior)

    const edgePointerFromEvent = function(event) {
        if (!event || typeof event.pageX !== "number" || typeof Graphics === "undefined" || typeof Graphics.pageToCanvasX !== "function") return;
        notePointer(Graphics.pageToCanvasX(event.pageX), Graphics.pageToCanvasY(event.pageY));
    };
    const edgePointerFromTouches = function(event) {
        if (!event || !event.changedTouches || typeof Graphics === "undefined" || typeof Graphics.pageToCanvasX !== "function") return;
        for (const touch of event.changedTouches) notePointer(Graphics.pageToCanvasX(touch.pageX), Graphics.pageToCanvasY(touch.pageY));
    };
    function aliasTouchInput(name, before) {
        if (typeof TouchInput === "undefined" || typeof TouchInput[name] !== "function") return;
        const original = TouchInput[name];
        TouchInput[name] = function() {
            before.apply(this, arguments);
            return original.apply(this, arguments);
        };
    }
    let edgeListenersInstalled = false;
    // Leaving the window (mouse-out to nothing), a hidden page: no pointer until the next event inside the canvas.
    function installEdgePointerListeners() {
        if (edgeListenersInstalled || typeof document === "undefined" || typeof document.addEventListener !== "function") return;
        edgeListenersInstalled = true;
        document.addEventListener("mouseout", event => { if (!event.relatedTarget && !event.toElement) notePointerGone(); });
        document.addEventListener("mouseleave", () => notePointerGone());
        document.addEventListener("visibilitychange", () => { if (document.hidden) notePointerGone(); });
    }
    aliasTouchInput("_onMouseMove", edgePointerFromEvent);
    aliasTouchInput("_onMouseDown", edgePointerFromEvent);
    aliasTouchInput("_onMouseUp", edgePointerFromEvent);
    aliasTouchInput("_onTouchStart", edgePointerFromTouches);
    aliasTouchInput("_onTouchMove", edgePointerFromTouches);
    aliasTouchInput("_onTouchEnd", notePointerGone);
    aliasTouchInput("_onTouchCancel", notePointerGone);
    aliasTouchInput("_onLostFocus", notePointerGone);
    aliasTouchInput("_setupEventHandlers", installEdgePointerListeners);

    /** Pan direction for a canvas position: { dx, dy } in -1 / 0 / 1 (zero outside the canvas or away from the edges). */
    function edgePanVector(x, y) {
        const v = { dx: 0, dy: 0 };
        if (typeof x !== "number" || typeof y !== "number" || typeof Graphics === "undefined" || !insideCanvas(x, y)) return v;
        if (x < EDGE_PAN_MARGIN) v.dx = -1;
        else if (x >= Graphics.width - EDGE_PAN_MARGIN) v.dx = 1;
        if (y < EDGE_PAN_MARGIN) v.dy = -1;
        else if (y >= Graphics.height - EDGE_PAN_MARGIN) v.dy = 1;
        return v;
    }

    /** True while a held press keeps TouchInput within TouchInput.moveThreshold (per axis) of the observed pointer:
     *  the engine's _onMove keeps the press origin until a drag exceeds that threshold, so within it TouchInput lags
     *  the observed pointer by design. False without a held press, or beyond the threshold. */
    function edgePointerWithinHeldPressThreshold() {
        if (typeof TouchInput === "undefined" || typeof TouchInput.isPressed !== "function" || !TouchInput.isPressed()) return false;
        const threshold = Number.isFinite(TouchInput.moveThreshold) && TouchInput.moveThreshold >= 0 ? TouchInput.moveThreshold : 0;
        return Math.abs(TouchInput.x - edgePointer.x) <= threshold && Math.abs(TouchInput.y - edgePointer.y) <= threshold;
    }
    /** True while that lag is in effect: a held press keeps TouchInput at its press origin and the observed pointer has
     *  moved off it (within the threshold). The only state in which the position the pan reads differs from the
     *  position the TouchInput-reading UI predicates test. */
    function edgePointerLagsHeldPress() {
        return edgePointerWithinHeldPressThreshold() && (TouchInput.x !== edgePointer.x || TouchInput.y !== edgePointer.y);
    }

    /** True when a visible display object's frame (w by h px at its x, y) contains the canvas position. */
    function frameContains(o, x, y, w, h) {
        return !!o && o.visible && w > 0 && h > 0 && x >= o.x && x < o.x + w && y >= o.y && y < o.y + h;
    }
    /** The Overseer's own windows (card, ledger, chronicle, container card) under a canvas position: what this plugin's
     *  Scene_Map.isAnyWindowUnderMouse answers for TouchInput's position. */
    function overseerWindowAt(scene, x, y) {
        const wins = [scene._colonyCard, scene._factionLedgerWindow, scene._ufChronicleWindow, scene._ufContainerCard].filter(w => w && w.visible);
        return wins.some(w => x >= w.x && x < w.x + w.width && y >= w.y && y < w.y + w.height);
    }
    /** UI under a canvas position other than TouchInput's: "" or the block reason. The UI predicates edgePanBlockReason
     *  consults take no position and this plugin never writes TouchInput, so this reads the same windows and HUD frames
     *  they test, through their own contracts: the Overseer's windows, DEUS_Camera's zoom slider (its minimized or full
     *  frame), the DEUS_TimeSpeed, DEUS_Levels and DEUS_Select HUD pieces, DEUS_Sheet's panel, the open windows of the
     *  window layer and the scene (DEUS.Look.isOverUI / DEUS.Select.pointerOverUI) and the bag. */
    function edgePanUIAt(scene, x, y) {
        if (!scene) return "";
        if (overseerWindowAt(scene, x, y)) return "window under the pointer";
        const slider = scene._deusZoomSlider || scene._deusScaleCalibrator;
        if (slider && frameContains(slider, x, y, slider._minimized ? slider._minW : slider._calW, slider._minimized ? slider._minH : slider._calH)) return "window under the pointer";
        for (const hud of [scene._ufTimeControls, scene._ufLevelPlate, scene._ufSelectToolbar, scene._ufGroupStrip, scene._ufWallPickerWindow]) {
            if (hud && frameContains(hud, x, y, hud.width, hud.height)) return "window under the pointer";
        }
        const sheet = scene._ufSheetWindow;
        if (sheet && sheet.visible && typeof sheet.isPointerInsideCoords === "function" && sheet.isPointerInsideCoords(x, y)) return "window under the pointer";
        const openWindow = w => !!w && w.visible && w.width > 0 && w.height > 0 && !(typeof w.isOpen === "function" && !w.isOpen());
        const layer = scene._windowLayer;
        if (layer && Array.isArray(layer.children) && layer.children.some(w => openWindow(w) && frameContains(w, x - layer.x, y - layer.y, w.width, w.height))) return "over UI";
        if (typeof Window !== "undefined" && Array.isArray(scene.children) && scene.children.some(w => w instanceof Window && openWindow(w) && !(w.opacity === 0 && w.contentsOpacity === 0) && frameContains(w, x, y, w.width, w.height))) return "over UI";
        const bag = scene._ufBagWindow;
        if (bag && bag.visible && typeof bag.isPointerInsideCoords === "function" && bag.isPointerInsideCoords(x, y)) return "over the bag";
        return "";
    }

    /** "" when edge panning may move the view this frame, else the first reason it must not (for checks and the console). */
    function edgePanBlockReason(scene) {
        if (!edgePanEnabled) return "disabled";
        if (!(edgePanSpeed > 0)) return "speed 0";
        if (!window.$gameMap || !window.$dataMap || typeof $gameMap.scrollLeft !== "function") return "no map";
        if (!$colonyManager || !$colonyManager.isOverseerMode) return "overseer mode off";
        if (typeof TouchInput === "undefined") return "no TouchInput";
        if (!edgePointer.seen) return "no pointer event yet";
        if (!edgePointer.inside) return "pointer outside the canvas";
        // Outside the engine's held-press lag, TouchInput must report the observed pointer's position exactly:
        // replayed or check-driven coordinates never pan.
        if (!edgePointerWithinHeldPressThreshold()) {
            if (TouchInput.x !== edgePointer.x || TouchInput.y !== edgePointer.y) return "TouchInput position is not the observed pointer";
        }
        if (!insideCanvas(TouchInput.x, TouchInput.y)) return "position outside the canvas";
        if (typeof Input !== "undefined" && (Input.isPressed("cameraLeft") || Input.isPressed("cameraRight") || Input.isPressed("cameraUp") || Input.isPressed("cameraDown"))) return "keyboard pan";
        const U = window.UF || null;
        if (U && U.ItemDrag && ((typeof U.ItemDrag.hasAttached === "function" && U.ItemDrag.hasAttached()) || (typeof U.ItemDrag.isDragging === "function" && U.ItemDrag.isDragging()))) return "item drag owns the pointer";
        if (U && U.Interact && typeof U.Interact.isOpen === "function" && U.Interact.isOpen()) return "context menu open";
        if (U && U.Talk && typeof U.Talk.isOpen === "function" && U.Talk.isOpen()) return "talk open";
        if (window.$gameMessage && typeof $gameMessage.isBusy === "function" && $gameMessage.isBusy()) return "message busy";
        if (scene && typeof scene.isAnyWindowUnderMouse === "function" && scene.isAnyWindowUnderMouse()) return "window under the pointer";
        if (U && U.Look && typeof U.Look.isOverUI === "function" && U.Look.isOverUI()) return "over UI";
        if (U && U.Select && typeof U.Select.pointerOverUI === "function" && U.Select.pointerOverUI()) return "over UI (select)";
        const bag = scene && scene._ufBagWindow;
        if (bag && bag.visible && typeof bag.isPointerInsideCoords === "function" && bag.isPointerInsideCoords(TouchInput.x, TouchInput.y)) return "over the bag";
        // Held-press lag: the predicates above answered for TouchInput's press origin, the position UI consumers act
        // on, while the pan reads the observed pointer (edgePanPosition). The same UI must be absent there too: a press
        // beside the zoom slider that slides onto it pauses, with TouchInput's press origin and threshold untouched.
        if (edgePointerLagsHeldPress()) {
            const underObserved = edgePanUIAt(scene, edgePointer.x, edgePointer.y);
            if (underObserved) return underObserved;
        }
        return "";
    }

    /** The canvas position the pan reads: the observed pointer while a held press keeps TouchInput lagging within the
     *  threshold, else TouchInput's position (which edgePanBlockReason has required to be the observed pointer). */
    function edgePanPosition() {
        if (edgePointerWithinHeldPressThreshold()) return { x: edgePointer.x, y: edgePointer.y };
        return { x: TouchInput.x, y: TouchInput.y };
    }

    /** One frame of edge panning. Scrolls the view only (never a unit); returns { dx, dy } when it scrolled, else null. */
    function edgePanStep(scene) {
        edgePanLast = null;
        if (edgePanBlockReason(scene)) return null;
        const p = edgePanPosition();
        const v = edgePanVector(p.x, p.y);
        if (!v.dx && !v.dy) return null;
        const cells = edgePanCellsPerFrame();
        if ($colonyManager && $colonyManager.cameraFollowUnit) $colonyManager.cameraFollowUnit = null;
        if (v.dx < 0) $gameMap.scrollLeft(cells.x);
        else if (v.dx > 0) $gameMap.scrollRight(cells.x);
        if (v.dy < 0) $gameMap.scrollUp(cells.y);
        else if (v.dy > 0) $gameMap.scrollDown(cells.y);
        edgePanLast = v;
        return v;
    }
    /** The speed in the scroll contract's unit, map cells per frame per axis (px / tile size). */
    function edgePanCellsPerFrame() {
        const tw = window.$gameMap && typeof $gameMap.tileWidth === "function" ? $gameMap.tileWidth() : 48;
        const th = window.$gameMap && typeof $gameMap.tileHeight === "function" ? $gameMap.tileHeight() : 48;
        return { x: tw > 0 ? edgePanSpeed / tw : 0, y: th > 0 ? edgePanSpeed / th : 0 };
    }

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        installEdgePointerListeners();
        if ($gamePlayer) {
            $gamePlayer.setTransparent(true);
            $gamePlayer.setThrough(true);
            // The camera stays where the view (player) was placed: UF_World starts a New Game on the home site.
        }
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateOverseerControls();
    };

    // Colonist adapter whose event stands under the mouse cell, or null.
    function colonistAt(mx, my) {
        for (const c of $colonyManager.colonists) {
            const ev = c.event;
            if (ev && Math.abs(ev.x - mx) <= 0.8 && Math.abs(ev.y - my) <= 0.8) return c;
        }
        const W = World();
        if (W && typeof W.units === "function") {
            const pid = window.UF && UF.Factions && typeof UF.Factions.playerId === "function" ? UF.Factions.playerId() : null;
            for (const u of W.units()) {
                if (u.data && (u.data.kind === "colonist" || u.data.faction === "player" || (pid !== null && u.data.faction === pid))) {
                    const ev = u.event || (W.eventOf && W.eventOf(u.id));
                    const ux = ev ? ev.x : u.x;
                    const uy = ev ? ev.y : u.y;
                    if (Math.abs(ux - mx) <= 0.8 && Math.abs(uy - my) <= 0.8) {
                        return adapterFor(u);
                    }
                }
            }
        }
        return null;
    }

    Scene_Map.prototype.updateOverseerControls = function() {
        if (!$colonyManager || !$colonyManager.isOverseerMode) return;

        // 1. WASD & arrow key camera panning
        const isPanning = Input.isPressed("cameraLeft") || Input.isPressed("cameraRight") || Input.isPressed("cameraUp") || Input.isPressed("cameraDown");
        if (isPanning && $colonyManager && $colonyManager.cameraFollowUnit) $colonyManager.cameraFollowUnit = null;
        if (Input.isPressed("cameraLeft")) $gameMap.scrollLeft(CAM_SPEED);
        if (Input.isPressed("cameraRight")) $gameMap.scrollRight(CAM_SPEED);
        if (Input.isPressed("cameraUp")) $gameMap.scrollUp(CAM_SPEED);
        if (Input.isPressed("cameraDown")) $gameMap.scrollDown(CAM_SPEED);

        // 1b. Edge panning: an actual pointer at a viewport edge pans the view; the keyboard pan and UI take precedence.
        if (!isPanning) edgePanStep(this);
        else edgePanLast = null;

        // 2. Left-click: select a colonist, or deselect if clicking away
        if (TouchInput.isTriggered() && !this.isAnyWindowUnderMouse()) {
            if (window.UF && UF.ItemDrag && UF.ItemDrag.hasAttached()) {
                // Mouse has an item attached for drop/transfer; let ItemDrag handle it!
                return;
            }
            const mx = $gameMap.canvasToMapX(TouchInput.x);
            const my = $gameMap.canvasToMapY(TouchInput.y);
            const clicked = colonistAt(mx, my);
            if (clicked) {
                $colonyManager.select(clicked);
                if (window.UF.Stance && UF.Stance.setSelected) UF.Stance.setSelected(null); // the corners follow the Overseer's selection
                SoundManager.playCursor();
            } else if ($colonyManager.selectedColonist || (window.UF && UF.Select && typeof UF.Select.hasSelection === "function" && UF.Select.hasSelection())) {
                const sh = window.UF && UF.Sheet;
                const hasObjectOrItem = sh && typeof sh.subjectAt === "function" && !!sh.subjectAt(mx, my);
                if (!hasObjectOrItem) {
                    // User directive: "If I have a unit selected and I left click elsewhere, I want to drop the current target, nothing else"
                    $colonyManager.deselect();
                    if (window.UF && UF.Select && typeof UF.Select.clearSelection === "function") {
                        UF.Select.clearSelection();
                    }
                    if (window.UF && UF.Select && typeof UF.Select.clearTileSelection === "function") {
                        UF.Select.clearTileSelection();
                    }
                    if (window.UF && UF.Select && typeof UF.Select.clearTargetedTile === "function") {
                        UF.Select.clearTargetedTile();
                    }
                    if (window.UF && UF.Sheet && typeof UF.Sheet.close === "function") {
                        UF.Sheet.close();
                    }
                    SoundManager.playCancel();
                }
            }
        }

        // 3. Right-click: use chest if clicked on container, else deselect
        if (TouchInput.isCancelled()) {
            const mx = $gameMap.canvasToMapX(TouchInput.x);
            const my = $gameMap.canvasToMapY(TouchInput.y);
            const W = World();
            const selUnit = ($colonyManager && $colonyManager.selectedColonist && $colonyManager.selectedColonist.unit) ||
                            (window.UF && UF.Select && UF.Select.selected && UF.Select.selected().length === 1 && W ? W.unit(UF.Select.selected()[0]) : null);
            if (selUnit) {
                const C = window.UF && UF.Containers;
                const O = window.UF && UF.Objects;
                const obj = O ? (O.atIn ? O.atIn(selUnit.area, mx, my) : O.at(mx, my)) : null;
                const cont = C ? C.at(selUnit.area, mx, my, selUnit.z || 0) : null;
                if ((obj && (obj.id === "chest_wood" || (C && C.isContainerType && C.isContainerType(obj.id)))) || cont) {
                    if (C && typeof C.useChest === "function") {
                        C.useChest(selUnit, cont || obj, mx, my);
                        return;
                    }
                }
                // User directive: With units selected, right-click orders them to move.
                const adapter = ($colonyManager && $colonyManager.selectedColonist) || adapterFor(selUnit);
                if (adapter && typeof adapter.assignMoveTo === "function") {
                    adapter.assignMoveTo(mx, my);
                } else {
                    const Col = Colonists();
                    if (Col && typeof Col.order === "function") {
                        Col.order(selUnit.id, { type: "move", target: { x: mx, y: my } });
                    }
                }
                return;
            }

            const interact = window.UF && UF.Interact;
            const menuTook = !!interact && ((typeof interact.tookCancel === "function" && interact.tookCancel()) || (typeof interact.isOpen === "function" && interact.isOpen()));
            if (!menuTook) {
                let didCancel = false;
                if ($colonyManager.selectedColonist) {
                    $colonyManager.deselect();
                    didCancel = true;
                }
                if (window.UF && UF.Target && UF.Target.targetedTile && UF.Target.targetedTile()) {
                    UF.Target.clearTargetedTile();
                    didCancel = true;
                }
                if (didCancel) SoundManager.playCancel();
            }
        }

        // 4. The card follows its colonist
        if (activeColonyWindow && activeColonyWindow.visible && Graphics.frameCount % CARD_REFRESH === 0) activeColonyWindow.refresh();
    };

    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        return overseerWindowAt(this, TouchInput.x, TouchInput.y);
    };

    // Free camera: the player never forces a scroll; a followed unit centres the view smoothly using floating coordinates.
    Game_Player.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
        const follow = $colonyManager && $colonyManager.cameraFollowUnit;
        if (!follow) return;
        const uev = follow.event || (follow instanceof Game_CharacterBase ? follow : null);
        let rx, ry;
        if (uev) {
            rx = uev._realX !== undefined ? uev._realX : uev.x;
            ry = uev._realY !== undefined ? uev._realY : uev.y;
        } else if (typeof follow.x === "number" && typeof follow.y === "number") {
            rx = follow.x;
            ry = follow.y;
        }
        if (typeof rx === "number" && typeof ry === "number") {
            $gameMap.setDisplayPos(rx - $gameMap.screenTileX() / 2, ry - $gameMap.screenTileY() / 2);
        }
    };

    //-----------------------------------------------------------------------------
    // The colonist card (Window_UFColonistCard)

    function Window_UFColonistCard() {
        this.initialize(...arguments);
    }

    Window_UFColonistCard.prototype = Object.create(Window_Base.prototype);
    Window_UFColonistCard.prototype.constructor = Window_UFColonistCard;

    Window_UFColonistCard.prototype.initialize = function() {
        const x = 16, y = Math.max(16, Graphics.boxHeight - CARD_H - 46);
        Window_Base.prototype.initialize.call(this, new Rectangle(x, y, CARD_W, CARD_H));
        this.opacity = 240;
        this.hide();
    };

    Window_UFColonistCard.prototype.refresh = function() {
        this.contents.clear();
        this._ufLoadText = "";
        const sel = $colonyManager.selectedColonist;
        const C = Colonists();
        const d = sel && C ? C.describe(sel.id) : null;
        if (!d) return;
        const w = this.innerWidth;
        const base = $gameSystem.mainFontSize ? $gameSystem.mainFontSize() : 26;
        this.contents.fontSize = 18;

        const portraitW = 72;
        const portraitH = 70;
        const portraitX = w - portraitW;
        const portraitY = 0;
        const textW = portraitX - 8;

        // Draw the stone-arch portrait at top-right
        this.drawPortrait(d, sel, portraitX, portraitY, portraitW, portraitH);

        // Line 0: name, gender, age, life stage, mood, pregnancy, illness
        this.changeTextColor(ColorManager.systemColor());
        let title = `${d.name} (${d.gender}${d.age !== undefined ? `, age ${d.age}` : ""}${d.stage ? ` · ${d.stage.charAt(0).toUpperCase() + d.stage.slice(1)}` : ""})`;
        if (d.pregnancy) title += ` [Pregnant: ${d.pregnancy.daysLeft}d]`;
        if (d.illness || (sel && sel.data && sel.data.illness)) {
            const ill = d.illness || sel.data.illness;
            const illName = ill.type ? (ill.type.charAt(0).toUpperCase() + ill.type.slice(1)) : "Dysentery";
            title += ` [Ill: ${illName}]`;
        }
        this.drawText(title, 0, 0, textW - 75, "left");
        let moodColor = "#ffff55";
        if (d.mood === "Ecstatic" || d.mood === "Happy") moodColor = "#55ff55";
        else if (d.mood === "Unhappy" || d.mood === "Stressed" || d.mood === "Miserable") moodColor = "#ff5555";
        this.changeTextColor(moodColor);
        this.drawText(`[${d.mood}]`, textW - 70, 0, 70, "right");

        // Line 1: faction and home site
        this.contents.fontSize = 13;
        this.changeTextColor("#94a3b8");
        this.drawText(`${d.faction}${d.site ? ` · ${d.site}` : ""}`, 0, 20, textW, "left");

        // Line 2: the job
        this.contents.fontSize = 15;
        this.resetTextColor();
        this.drawText(`Job: ${d.job}`, 0, 38, textW, "left");

        // Line 3: what it carries (V89; UF_Sheet words it), nothing when it carries nothing
        this.contents.fontSize = 14;
        this.changeTextColor("#f0dca0");
        const S = window.UF && UF.Sheet;
        const load = S && typeof S.loadOf === "function" ? S.loadOf(sel.id) : null;
        this._ufLoadText = load && typeof S.fittedLoadText === "function" ? S.fittedLoadText(load, textW, text => this.textWidth(text)) : "";
        if (this._ufLoadText) this.drawText(this._ufLoadText, 0, LOAD_Y, textW, "left");
        this.resetTextColor();
        const dy = BELOW_LOAD;

        // Tool and clothes
        this.contents.fontSize = 14;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Tool:", 0, 70 + dy, 50, "left");
        this.drawText("Wears:", 180, 70 + dy, 60, "left");
        this.resetTextColor();
        this.drawText(d.tool || "none", 50, 70 + dy, 125, "left");
        this.drawText(d.clothes ? `${d.clothes} (tier ${d.tier})` : (d.tier ? `tier ${d.tier}` : "nothing"), 240, 70 + dy, w - 240, "left");

        // Need gauges
        const u = (sel && sel.unit) || sel;
        const hungerVal = typeof sel.hunger === "number" ? Math.round(sel.hunger) : (u && u.data && typeof u.data.hunger === "number" ? Math.round(u.data.hunger) : 0);
        const thirstVal = typeof sel.thirst === "number" ? Math.round(sel.thirst) : (u && u.data && typeof u.data.thirst === "number" ? Math.round(u.data.thirst) : 0);
        const fatigueVal = typeof sel.fatigue === "number" ? Math.round(sel.fatigue) : (u && u.data && typeof u.data.fatigue === "number" ? Math.round(u.data.fatigue) : 0);
        this.contents.fontSize = 13;
        this.drawNeedGauge("Hunger", Math.max(0, 100 - hungerVal), 100, "#ffaa44", 94 + dy);
        this.drawNeedGauge("Thirst", Math.max(0, 100 - thirstVal), 100, "#44aaff", 112 + dy);
        this.drawNeedGauge("Rest", Math.max(0, 100 - fatigueVal), 100, "#a855f7", 130 + dy);

        this.contents.fontSize = 12;
        this.changeTextColor("#38bdf8");
        this.drawText("[F] factions · [H] chronicle", 0, 154 + dy, w, "left");
        this.contents.fontSize = base;
        this.resetTextColor();
    };

    Window_UFColonistCard.prototype.drawNeedGauge = function(label, current, max, color, y) {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(label, 0, y, 65, "left");
        const gx = 70, gw = 180, gh = 10;
        this.contents.fillRect(gx, y + 6, gw, gh, "rgba(20, 20, 25, 0.8)");
        const rate = Math.min(1.0, Math.max(0.0, current / max));
        this.contents.fillRect(gx, y + 6, Math.round(gw * rate), gh, color);
        this.resetTextColor();
        this.drawText(`${Math.round(current)}/${max}`, gx + gw + 10, y, 60, "left");
    };

    Window_UFColonistCard.prototype.drawPortrait = function(d, sel, x, y, w, h) {
        let face = (d && d.face) || (sel && sel.unit && sel.unit.data && sel.unit.data.face);
        if (!face && sel && sel.unit) {
            const S = window.UF && UF.Sheet;
            if (S && typeof S.faceSpecOf === "function") {
                const spec = S.faceSpecOf(sel.unit);
                if (spec && spec.type === "face") face = { sheet: spec.sheet, index: spec.index };
            }
        }
        if (!face && sel && sel.unit) {
            const F = window.UF && UF.Factions;
            if (F && typeof F.cultureFace === "function") {
                const cf = F.cultureFace(sel.unit);
                if (cf && cf.sheet) face = { sheet: cf.sheet, index: cf.index };
            }
        }
        if (!face) {
            const gender = (d && d.gender && String(d.gender).toLowerCase()) || "male";
            face = { sheet: gender === "male" ? "UF_Faces_human_1" : "UF_Faces_human_2", index: 0 };
        }

        const c = this.contents;
        // Stone frame borders and dark slate opening
        c.fillRect(x, y, w, h, "#18181f");
        c.fillRect(x, y, w, 1, "#475569");
        c.fillRect(x, y, 1, h, "#475569");
        c.fillRect(x, y + h - 1, w, 1, "#1e293b");
        c.fillRect(x + w - 1, y, 1, h, "#1e293b");
        c.fillRect(x + 1, y + 1, w - 2, 1, "#64748b");
        c.fillRect(x + 1, y + 1, 1, h - 2, "#64748b");

        if (face && face.sheet) {
            const bmp = ImageManager.loadFace(face.sheet);
            if (!bmp.isReady()) {
                if (!bmp._ufCardListening) {
                    bmp._ufCardListening = true;
                    bmp.addLoadListener(() => {
                        if (this.visible && this.parent) this.refresh();
                    });
                }
                return;
            }
            const fw = ImageManager.faceWidth || 144;
            const fh = ImageManager.faceHeight || 144;
            const sx = (face.index % 4) * fw;
            const sy = Math.floor(face.index / 4) * fh;
            c.blt(bmp, sx, sy, fw, fh, x + 2, y + 2, w - 4, h - 4);

            // Dynamic Armor Reflection: reflect currently equipped armor on bottom portion (y: 108..144)
            const unitObj = (sel && (sel.unit || sel)) || (d && d.id && Colonists && Colonists() ? Colonists().colonist(d.id) : null);
            const armorSheet = (window.UF && UF.Generator && typeof UF.Generator.armorSheetForUnit === "function") ?
                UF.Generator.armorSheetForUnit(unitObj, d) : null;
            if (armorSheet) {
                const armorBmp = ImageManager.loadFace(armorSheet);
                if (armorBmp && armorBmp.isReady()) {
                    c.blt(armorBmp, 0, 0, 144, 144, x + 2, y + 2, w - 4, h - 4);
                } else if (armorBmp && !armorBmp._ufArmorListening) {
                    armorBmp._ufArmorListening = true;
                    armorBmp.addLoadListener(() => {
                        if (this.visible && this.parent) this.refresh();
                    });
                }
            }
        }
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        // Left card retired per user directive 2026-09-22: inventory on right pops up instead
        this._colonyCard = null;
        activeColonyWindow = null;
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Overseer = {
        card: () => activeColonyWindow,
        /** The card's load line as last drawn ("" when the colonist carries nothing or no card is shown). */
        cardLoadText: () => (activeColonyWindow && activeColonyWindow.visible ? activeColonyWindow._ufLoadText || "" : ""),
        /** The load line's band in the card's contents (for checks that read its pixels). */
        loadRect: () => ({ x: 0, y: LOAD_Y + 13, w: activeColonyWindow ? activeColonyWindow.innerWidth : CARD_W - 24, h: 13 }),
        colonistAt,
        CARD_W, CARD_H, LOAD_Y,
        /** Edge panning (see the header): a toggle, a speed in map px per frame, and what the per-frame step sees. */
        edgePan: {
            MARGIN: EDGE_PAN_MARGIN,
            MAX_SPEED: EDGE_PAN_MAX_SPEED,
            DEFAULT_SPEED: EDGE_PAN_DEFAULT_SPEED,
            enabled: () => edgePanEnabled,
            setEnabled(on) { edgePanEnabled = !!on; return edgePanEnabled; },
            toggle() { edgePanEnabled = !edgePanEnabled; return edgePanEnabled; },
            speed: () => edgePanSpeed,
            setSpeed(px) { edgePanSpeed = parseEdgePanSpeed(px); return edgePanSpeed; },
            cellsPerFrame: edgePanCellsPerFrame,
            parseSpeed: parseEdgePanSpeed,
            parseEnabled: parseEdgePanEnabled,
            vector: edgePanVector,
            notePointer,
            notePointerGone,
            pointer: () => ({ seen: edgePointer.seen, inside: edgePointer.inside, x: edgePointer.x, y: edgePointer.y }),
            blockReason: edgePanBlockReason,
            step: edgePanStep,
            lastStep: () => (edgePanLast ? { dx: edgePanLast.dx, dy: edgePanLast.dy } : null)
        }
    };

    //-----------------------------------------------------------------------------
    // Exploration wrappers: exploration lives in UF_Fog; these keep older callers working.

    Game_System.prototype.getExploredGrid = function(mapId) {
        this._ufExploredMaps = this._ufExploredMaps || {};
        if (!this._ufExploredMaps[mapId]) this._ufExploredMaps[mapId] = {};
        return this._ufExploredMaps[mapId];
    };
    Game_System.prototype.isTileExplored = function(mapId, x, y) {
        if (window.UF && UF.Fog && mapId === $gameMap.mapId()) return UF.Fog.isExplored(x, y);
        const grid = this.getExploredGrid(mapId);
        return !!grid[`${x},${y}`];
    };
    Game_System.prototype.exploreTile = function(mapId, x, y) {
        if (window.UF && UF.Fog && mapId === $gameMap.mapId()) return UF.Fog.reveal(x, y, 0);
        const grid = this.getExploredGrid(mapId);
        grid[`${x},${y}`] = true;
    };

    // Hide events on unexplored cells (UF_Fog decides what's explored; with fog off everything is).
    // Colonists and terrain-tagged events are always drawn.
    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        if (!this.visible || !this._character || this._character === $gamePlayer) return;
        const W = World();
        const unit = W && W.unitOfEvent ? W.unitOfEvent(this._character) : null;
        const pid = window.UF && UF.Factions && typeof UF.Factions.playerId === "function" ? UF.Factions.playerId() : null;
        const isMine = unit && unit.data && (unit.data.kind === "colonist" || unit.data.faction === "player" || (pid !== null && unit.data.faction === pid));
        if (isMine) return;
        const ev = this._character.event ? this._character.event() : null;
        if (ev && ev.note && (ev.note.includes("<tree>") || ev.note.includes("<canopy>") || ev.note.includes("<terrain>"))) return;
        if (window.UF && UF.Fog && UF.Fog.enabled) {
            if (typeof this._character.x === "number" && !UF.Fog.isVisible(this._character.x, this._character.y)) this.visible = false;
        } else if ($gameSystem && $gameMap && typeof this._character.x === "number" && !$gameSystem.isTileExplored($gameMap.mapId(), this._character.x, this._character.y)) {
            this.visible = false;
        }
    };

    //-----------------------------------------------------------------------------
    // Checks (UF_Test suite "overseer"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && UF.Test && UF.Test.active) registerChecks();
    };

    // Edge panning: a simulated pointer (TouchInput._x/_y plus notePointer, so both agree) at the edge with room to scroll
    // moves the view and nothing else; disabled, and a window under the pointer, leave the view where it is.
    async function edgePanChecks(t) {
        const EP = window.UF.Overseer.edgePan;
        const scene = SceneManager._scene;
        const was = { x: TouchInput._x, y: TouchInput._y, enabled: EP.enabled(), display: { x: $gameMap.displayX(), y: $gameMap.displayY() },
            follow: $colonyManager.cameraFollowUnit, player: { x: $gamePlayer.x, y: $gamePlayer.y } };
        const roomRight = $gameMap.isLoopHorizontal() || $gameMap.displayX() + 1 < $gameMap.width() - $gameMap.screenTileX();
        const px = roomRight ? Graphics.width - 2 : 1, py = Math.floor(Graphics.height / 2);
        const panned = async () => {
            const x0 = $gameMap.displayX();
            await t.waitFrames(4);
            return $gameMap.displayX() !== x0;
        };
        let w = null;
        try {
            EP.setEnabled(true);
            TouchInput._x = px; TouchInput._y = py;
            EP.notePointer(px, py);
            const moved = await panned();
            t.check("edge_pan_moves_view", moved && $gamePlayer.x === was.player.x && $gamePlayer.y === was.player.y && EP.blockReason(scene) === "",
                `pointer at (${px},${py}) ${roomRight ? "right" : "left"} edge: displayX ${moved ? "changed" : "unchanged"}, player at (${$gamePlayer.x},${$gamePlayer.y}), block "${EP.blockReason(scene)}", ${EP.speed()} px/frame = ${EP.cellsPerFrame().x.toFixed(4)} cells/frame`);
            EP.setEnabled(false);
            const movedOff = await panned();
            EP.setEnabled(true);
            w = new Window_Base(new Rectangle(roomRight ? Graphics.width - 120 : 0, py - 40, 120, 80));
            scene.addWindow(w);
            const movedUI = await panned();
            t.check("edge_pan_pauses", !movedOff && !movedUI,
                `disabled: view ${movedOff ? "MOVED" : "still"}; 120x80 window under the pointer: view ${movedUI ? "MOVED" : "still"} (block "${EP.blockReason(scene)}")`);
        } finally {
            if (w && scene._windowLayer) scene._windowLayer.removeChild(w);
            EP.setEnabled(was.enabled);
            EP.notePointerGone();
            TouchInput._x = was.x; TouchInput._y = was.y;
            $colonyManager.cameraFollowUnit = was.follow;
            $gameMap.setDisplayPos(was.display.x, was.display.y);
        }
    }

    function registerChecks() {
        UF.Test.suite("overseer", async t => {
            await edgePanChecks(t);
            const C = Colonists(), J = Jobs();
            const list = $colonyManager.colonists;
            t.check("adapter_lists_colonists", !!C && list.length >= 2 && list.every(c => c.event && typeof c.name === "string" && c.name && typeof c.hunger === "number"),
                C ? `${list.length} adapters: ${list.map(c => `${c.name} (${c.gender}, ${c.currentJob})`).join("; ")}` : "UF.Colonists missing");
            if (!C || !list.length) return;
            const c = list[0];
            const zoom = window.UF.Camera ? UF.Camera.zoom() : 1;
            const ev = c.event;
            // A click on the colonist's cell selects it and opens the card with its name, faction and job.
            $gamePlayer.locate(ev.x, ev.y);
            await t.waitFrames(3);
            TouchInput._x = Math.round(($gameMap.adjustX(ev.x) * $gameMap.tileWidth() + $gameMap.tileWidth() / 2) * zoom);
            TouchInput._y = Math.round(($gameMap.adjustY(ev.y) * $gameMap.tileHeight() + $gameMap.tileHeight() / 2) * zoom);
            const clicked = colonistAt($gameMap.canvasToMapX(TouchInput.x), $gameMap.canvasToMapY(TouchInput.y));
            $colonyManager.select(clicked);
            await t.waitFrames(15);
            const card = SceneManager._scene._colonyCard;
            const d = C.describe(c.id);
            const sheetOpen = window.UF && UF.Sheet && typeof UF.Sheet.isOpen === "function" && UF.Sheet.isOpen();
            t.check("click_selects_and_card_opens", clicked === c && $colonyManager.selectedColonist === c && (!card || !card.visible) && !!d && d.name === c.name && d.faction.length > 0,
                `mouse at (${TouchInput.x},${TouchInput.y}) over ${c.name} at (${ev.x},${ev.y}) -> colonistAt ${clicked ? clicked.name : "null"}; card retired; sheet open ${sheetOpen}; title "${d ? `${d.name} (${d.gender}) · ${d.faction} · ${d.site}` : ""}", job "${d ? d.job : ""}"`);
            t.screenshot("card");
            // An order through the adapter: a move job owned by the colonist.
            const job = c.assignMoveTo(ev.x + 2, ev.y);
            t.check("ground_click_orders_move", !!job && job.type === "move" && job.owner === c.id && J.of(c.id) === job, `assignMoveTo -> ${job ? `${job.type} #${job.id} ${job.state}` : "null"}`);
            // Society progress summary
            const prog = $colonyManager.societyProgress;
            t.check("society_progress", Array.isArray(prog.steps) && prog.steps.length > 0 && typeof prog.text === "string" && prog.text.includes(":"), `"${prog.text}"`);
            $colonyManager.deselect();
            await t.waitFrames(2);
            t.check("deselect_hides_card", !$colonyManager.selectedColonist && (!card || !card.visible), `card visible after deselect: ${card ? card.visible : "retired"}`);
            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during overseer checks");
        }, { isDefault: false });
    }
})();
