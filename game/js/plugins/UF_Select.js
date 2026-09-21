//=============================================================================
// UF_Select.js - Drag boxes, group selection and area designation tools
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Select] Drag rectangles to select units and to mark areas with designation tools (chop, gather, mine, quarry, dismantle, build, zones, cancel), like modern DF.
 * @author UF project
 * @base UF_World
 * @base UF_Jobs
 * @base UF_Interact
 * @orderAfter UF_Interact
 * @orderAfter UF_Sheet
 * @orderAfter UF_Talk
 *
 * @param TestProvoke
 * @text Checks to provoke FAIL
 * @desc Comma list of check names to provoke into FAIL during tests (or 'all').
 * @default
 *
 * @help
 * Implements modern DF-style drag rectangles and unit group management (VISION V86).
 *
 * Mouse gestures:
 *   Left-drag with no tool: selects all player units inside the box.
 *   Shift + Left-drag: adds units to selection.
 *   Left-click on ground with >= 2 units selected: moves group in compact formation (V68).
 *   Left-drag with a tool: marks all eligible cells with that tool's designation.
 *   Right-click / Esc: backs out one step (cancels box -> leaves tool -> clears selection).
 *
 * Tools (toolbar or keys):
 *   Chop (C), Gather (G), Pick up (P), Mine (M), Quarry (R), Dig (V),
 *   Dismantle (T), Build floor (L), Build wall (B), Mark stockpile (O), Cancel (N).
 *
 * API, events, architecture and checks: docs/systems/UF_Select.md
 * Design: docs/design/SELECTION.md
 */

(() => {
    "use strict";

    const pluginParams = PluginManager.parameters("UF_Select") || {};
    function getProvokeString() {
        try {
            if (typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) {
                return String(process.env.UF_TEST_PROVOKE);
            }
            if (pluginParams.TestProvoke) {
                return String(pluginParams.TestProvoke);
            }
        } catch (_) {}
        return "";
    }
    function isProvoked(name) {
        if (!name) return false;
        const prov = getProvokeString().toLowerCase();
        if (!prov) return false;
        const low = name.toLowerCase();
        const set = prov.split(",").map(s => s.trim()).filter(Boolean);
        return set.includes("all") || set.includes("select.all") || set.includes(low) || set.includes(`select.${low}`);
    }

    // Default catalog config if not in UF_WorldCatalog.json
    const DEFAULT_CONFIG = {
        limits: { openMarks: 2000, formationRadius: 12, stripNames: 12 },
        budgets: { previewMs: 2, commitMs: 3, minCellsPerFrame: 16 },
        summarySeconds: 6,
        colors: {
            box: "#f8fafc",
            boxFill: 0.1,
            selectFill: 0.08,
            eligible: 0.35,
            zones: { stockpile: "#86efac" },
            zoneAlpha: 0.25
        },
        tools: [
            { id: "chop", key: "C", keyCode: 67, label: "Chop", options: ["action:chop"], job: "chop", candidates: "objectAction", color: "#f5c542", hint: "Chop: drag over trees." },
            { id: "gather", key: "G", keyCode: 71, label: "Gather", options: ["action:gather"], job: "gather", candidates: "objectAction", color: "#a3e635", hint: "Gather: drag over bushes and plants." },
            { id: "pick", key: "P", keyCode: 80, label: "Pick up", options: ["action:pick"], job: "pick", candidates: "objectAction", color: "#e5e7eb", hint: "Pick up: drag over loose stones and sticks." },
            { id: "mine", key: "M", keyCode: 77, label: "Mine", options: ["action:mine"], job: "mine", candidates: "objectAction", color: "#fb923c", hint: "Mine: drag over rock and ore." },
            { id: "quarry", key: "R", keyCode: 82, label: "Quarry", options: ["action:quarry"], job: "quarry", candidates: "objectAction", color: "#d6d3d1", hint: "Quarry: drag over stone." },
            { id: "dig", key: "V", keyCode: 86, label: "Dig", options: ["dig"], job: "dig", candidates: "openLand", color: "#c08a4a", hint: "Dig: drag over ground." },
            { id: "dismantle", key: "T", keyCode: 84, label: "Dismantle", options: ["dismantle"], job: "dismantle", candidates: "built", color: "#f87171", hint: "Dismantle: drag over buildings." },
            { id: "floor", key: "L", keyCode: 76, label: "Build floor", options: ["floor:lay"], job: "floor", candidates: "floorable", color: "#d4a373", hint: "Build floor: drag over ground." },
            { id: "wall", key: "B", keyCode: 66, label: "Build wall", options: ["build:<wall>"], job: "build", candidates: "openLand", picker: "wall", color: "#38bdf8", hint: "Build wall: drag where the walls go." },
            { id: "stockpile", key: "O", keyCode: 79, label: "Mark stockpile", options: ["stockpile"], job: "build", object: "stockpile", candidates: "openLand", zone: "stockpile", color: "#86efac", hint: "Mark stockpile: drag over free ground." },
            { id: "cancel", key: "N", keyCode: 78, label: "Cancel", options: ["cancel"], candidates: "designations", color: "#ef4444", hint: "Cancel: drag over marked work." }
        ],
        zones: { stockpile: { label: "Stockpile", option: "stockpile" } }
    };

    const KEY_CODES = {
        C: 67, G: 71, P: 80, M: 77, R: 82, V: 86, T: 84, L: 76, B: 66, O: 79, N: 78
    };

    function getConfig() {
        const cat = window.$ufWorldCatalog && window.$ufWorldCatalog.select;
        if (!cat) return DEFAULT_CONFIG;
        return {
            limits: Object.assign({}, DEFAULT_CONFIG.limits, cat.limits),
            budgets: Object.assign({}, DEFAULT_CONFIG.budgets, cat.budgets),
            summarySeconds: cat.summarySeconds || DEFAULT_CONFIG.summarySeconds,
            colors: Object.assign({}, DEFAULT_CONFIG.colors, cat.colors),
            tools: Array.isArray(cat.tools) && cat.tools.length ? cat.tools : DEFAULT_CONFIG.tools,
            zones: Object.assign({}, DEFAULT_CONFIG.zones, cat.zones)
        };
    }

    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Look = () => (window.UF && UF.Look) || null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const Interact = () => (window.UF && UF.Interact) || null;
    const Stance = () => (window.UF && UF.Stance) || null;
    const Floors = () => (window.UF && UF.Floors) || null;

    const emit = (name, ...args) => {
        if (window.UF && UF.Events && typeof UF.Events.emit === "function") {
            UF.Events.emit(name, ...args);
        }
    };

    function copyArea(a) {
        return a ? { x: a.x, y: a.y } : { x: 0, y: 0 };
    }

    function viewZ() {
        if (window.UF && UF.Levels && typeof UF.Levels.viewZ === "function") {
            return UF.Levels.viewZ();
        }
        const W = World();
        if (W && W.state && W.state.view && typeof W.state.view.z === "number") {
            return W.state.view.z;
        }
        return 0;
    }

    function findUnitAt(x, y, area, z = 0) {
        const W = World();
        if (!W || !W.units) return null;
        const all = W.units();
        const ax = area ? area.x : (W.currentArea ? W.currentArea().x : 0);
        const ay = area ? area.y : (W.currentArea ? W.currentArea().y : 0);
        for (const u of all) {
            if (u.x === x && u.y === y && u.area && u.area.x === ax && u.area.y === ay && (u.z || 0) === z) {
                return u;
            }
        }
        return null;
    }

    function isPlayerUnit(u) {
        if (!u) return false;
        if (isProvoked("box_units")) {
            // Provocation: include allied units
            return true;
        }
        const C = Colonists();
        if (C && typeof C.isColonist === "function" && C.isColonist(u)) return true;
        if (u.data && u.data.kind === "colonist") return true;
        if (u.data && u.data.faction === "player") return true;
        const F = window.UF && UF.Factions;
        if (F && typeof F.player === "function") {
            const p = F.player();
            if (p && u.data && u.data.faction === p.id) return true;
        }
        return false;
    }

    // Key tracking & registration
    const registeredKeys = {};
    const toolByKeyAction = {};
    function initKeys() {
        const cfg = getConfig();
        for (const t of cfg.tools) {
            const code = t.keyCode || KEY_CODES[t.key];
            if (code) {
                const actionName = `uf_select_${t.id}`;
                if (Input.keyMapper[code] && Input.keyMapper[code] !== actionName) {
                    registeredKeys[code] = { collided: true, original: Input.keyMapper[code], action: actionName };
                } else {
                    registeredKeys[code] = { collided: false, action: actionName };
                    Input.keyMapper[code] = actionName;
                }
                toolByKeyAction[actionName] = t.id;
            }
        }
        if (isProvoked("keys_free")) {
            // Provoke key collision with Combat (K = 75)
            Input.keyMapper[75] = "uf_select_chop";
            registeredKeys[75] = { collided: true, original: "combat_test", action: "uf_select_chop" };
        }
    }
    initKeys();

    //-------------------------------------------------------------------------
    // Bitset helpers for stockpile zones
    //-------------------------------------------------------------------------

    function bitsetEncode(bytes) {
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
    }

    function bitsetDecode(b64) {
        const binary = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function zoneHasCell(zone, x, y) {
        if (!zone || x < zone.x0 || x >= zone.x0 + zone.w || y < zone.y0 || y >= zone.y0 + zone.h) return false;
        if (!zone._bytes) zone._bytes = bitsetDecode(zone.cells);
        const idx = (y - zone.y0) * zone.w + (x - zone.x0);
        const byteIdx = Math.floor(idx / 8);
        const bitIdx = idx % 8;
        if (byteIdx >= zone._bytes.length) return false;
        return (zone._bytes[byteIdx] & (1 << bitIdx)) !== 0;
    }

    function zoneRemoveCell(zone, x, y) {
        if (!zone || x < zone.x0 || x >= zone.x0 + zone.w || y < zone.y0 || y >= zone.y0 + zone.h) return false;
        if (!zone._bytes) zone._bytes = bitsetDecode(zone.cells);
        const idx = (y - zone.y0) * zone.w + (x - zone.x0);
        const byteIdx = Math.floor(idx / 8);
        const bitIdx = idx % 8;
        if (byteIdx >= zone._bytes.length) return false;
        if ((zone._bytes[byteIdx] & (1 << bitIdx)) !== 0) {
            zone._bytes[byteIdx] &= ~(1 << bitIdx);
            zone.cells = bitsetEncode(zone._bytes);
            return true;
        }
        return false;
    }

    function zoneCountCells(zone) {
        if (!zone) return 0;
        if (!zone._bytes) zone._bytes = bitsetDecode(zone.cells);
        let count = 0;
        for (let i = 0; i < zone._bytes.length; i++) {
            let b = zone._bytes[i];
            while (b > 0) {
                if (b & 1) count++;
                b >>= 1;
            }
        }
        return count;
    }

    function ensureSelectState() {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.select) {
            W.state.select = {
                version: 1,
                nextZone: { stockpile: 1 },
                zones: [],
                commits: []
            };
        }
        return W.state.select;
    }

    //-------------------------------------------------------------------------
    // Selection state & API
    //-------------------------------------------------------------------------

    let selectedGroup = [];      // Unit IDs in selection
    let activeTool = null;        // Tool id (string) or null
    let chosenWall = "wall_wood"; // Wall id for 'wall' tool
    let statusText = "";
    let statusTimer = 0;
    let lastSummaryData = null;
    const perfStats = { previewMs: 0, commitMs: 0, worstFrameMs: 0, frames: 0 };

    let targetedTileCoord = null;
    function setTargetedTile(x, y) {
        if (typeof x === "number" && typeof y === "number") {
            targetedTileCoord = { x, y };
        } else if (x && typeof x.x === "number" && typeof x.y === "number") {
            targetedTileCoord = { x: x.x, y: x.y };
        } else {
            targetedTileCoord = null;
        }
    }
    function clearTargetedTile() {
        targetedTileCoord = null;
    }
    function targetedTile() {
        return targetedTileCoord ? Object.assign({}, targetedTileCoord) : null;
    }

    function getSelectedUnits() {
        const W = World();
        if (!W) return [];
        return selectedGroup.map(id => W.unit(id)).filter(Boolean);
    }

    function setSelection(ids, options = {}) {
        const W = World();
        if (!W) return;
        const add = !!options.add;
        const validIds = [];
        for (const id of ids) {
            const u = W.unit(id);
            if (u && isPlayerUnit(u) && !validIds.includes(id)) {
                validIds.push(id);
            }
        }

        if (add) {
            for (const id of validIds) {
                if (!selectedGroup.includes(id)) selectedGroup.push(id);
            }
        } else {
            selectedGroup = validIds;
        }

        syncOverseerSelection();
        emit("select:changed", selectedGroup.slice());
    }

    function clearSelection() {
        selectedGroup = [];
        syncOverseerSelection();
        clearTargetedTile();
        emit("select:changed", []);
    }

    function primaryUnit() {
        const W = World();
        if (!W || !selectedGroup.length) return null;
        const C = Colonists();
        // Return first colonist, or first unit
        for (const id of selectedGroup) {
            const u = W.unit(id);
            if (u && C && typeof C.isColonist === "function" && C.isColonist(u)) return u;
            if (u && u.data && u.data.kind === "colonist") return u;
        }
        return W.unit(selectedGroup[0]);
    }

    let syncingOverseer = false;
    function syncOverseerSelection() {
        const cm = window.$colonyManager;
        if (!cm) return;
        syncingOverseer = true;
        try {
            const prim = primaryUnit();
            if (prim) {
                const adapter = cm.colonists ? cm.colonists.find(c => c.id === prim.id) : null;
                if (adapter) cm.select(adapter);
                else cm.select({ id: prim.id, name: prim.name, event: prim.event || (World() && World().eventOf(prim.id)) });
            } else {
                cm.deselect();
            }
        } finally {
            syncingOverseer = false;
        }
    }

    function setTool(toolId, params = {}) {
        const cfg = getConfig();
        const t = cfg.tools.find(item => item.id === toolId);
        if (toolId && !t) return false;
        activeTool = toolId || null;
        if (params.wall) chosenWall = params.wall;

        if (activeTool) {
            const hint = t ? t.hint : "";
            setStatus(hint);
            updateCanvasCursor(t);
        } else {
            setStatus("");
            updateCanvasCursor(null);
        }
        emit("select:toolChanged", activeTool);
        return true;
    }

    function setStatus(text, seconds = 0) {
        statusText = text || "";
        const cfg = getConfig();
        statusTimer = seconds > 0 ? Math.round(seconds * 60) : (text ? Math.round(cfg.summarySeconds * 60) : 0);
    }

    //-------------------------------------------------------------------------
    // Gesture engine
    //-------------------------------------------------------------------------

    let gestureState = "idle"; // "idle" | "pending" | "dragging"
    let pendingGesture = null;  // { sx, sy, mx, my, z, area, frame, shift }
    let activeBox = null;       // { x0, y0, x1, y1, z, area, shift, tool }
    let previewCache = null;    // Uint8Array 256x256
    let previewCount = 0;
    let previewDone = true;
    let previewCursor = 0;
    let replayingClick = false;
    let replayData = null;      // { x, y }
    let savedPointer = null;

    function pointerOverUI() {
        const scene = SceneManager._scene;
        if (!scene) return false;
        if (isProvoked("no_clickthrough")) return false; // Provocation: skip UI check

        if (typeof scene.isAnyWindowUnderMouse === "function" && scene.isAnyWindowUnderMouse()) return true;

        const layer = scene._windowLayer;
        if (layer) {
            const mx = TouchInput.x - layer.x, my = TouchInput.y - layer.y;
            for (const w of layer.children) {
                if (!w || !w.visible || w.width <= 0 || w.height <= 0) continue;
                if (typeof Window_MapName !== "undefined" && w instanceof Window_MapName) continue;
                if (w.opacity === 0 && w.contentsOpacity === 0) continue;
                if (typeof w.isOpen === "function" && !w.isOpen()) continue;
                if (mx >= w.x && my >= w.y && mx < w.x + w.width && my < w.y + w.height) return true;
            }
        }

        // Check scene direct children that are windows
        const mx = TouchInput.x, my = TouchInput.y;
        if (scene.children) {
            for (const child of scene.children) {
                if (child instanceof Window && child.visible && child.width > 0 && child.height > 0) {
                    if (typeof Window_MapName !== "undefined" && child instanceof Window_MapName) continue;
                    if (child.opacity === 0 && child.contentsOpacity === 0) continue;
                    if (typeof child.isOpen === "function" && !child.isOpen()) continue;
                    if (mx >= child.x && my >= child.y && mx < child.x + child.width && my < child.y + child.height) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function isMapBusy() {
        const I = Interact();
        if (I && typeof I.isOpen === "function" && I.isOpen()) return true;
        if (I && typeof I.swallowedFrame === "function" && I.swallowedFrame() === Graphics.frameCount) return true;
        if ($gameMessage && $gameMessage.isBusy()) return true;
        const T = window.UF && UF.Talk;
        if (T && typeof T.isOpen === "function" && T.isOpen()) return true;
        return false;
    }

    function cancelBox(reason) {
        if (activeBox) {
            activeBox = null;
            previewCache = null;
            setStatus(reason ? `Box cancelled: ${reason}.` : "Box cancelled.");
            emit("select:boxCancelled", reason || "cancelled");
        }
        const L = Look();
        if (L && typeof L.enabled !== "undefined") L.enabled = true;
        gestureState = "idle";
        pendingGesture = null;
    }

    //-------------------------------------------------------------------------
    // Candidate checks (cheap pre-filter)
    //-------------------------------------------------------------------------

    function isCandidateCell(toolDef, x, y, area, z) {
        const O = Objects(), J = Jobs();
        if (!J) return false;
        const type = O ? (O.atIn ? O.atIn(area, x, y) : O.at(x, y)) : null;
        const water = J.isWaterAt(area, x, y);
        const blocking = !!type && type.passable !== true;

        switch (toolDef.candidates) {
            case "objectAction": {
                const act = toolDef.job || toolDef.id;
                if (type && type.actions && type.actions[act] && J.handler(act)) return true;
                if ((act === "mine" || act === "quarry") && z < 0) {
                    const L = window.UF && UF.Levels;
                    if (L && typeof L.shapeAt === "function" && L.shapeAt({ area, x, y, z }) === "solid") {
                        return true;
                    }
                }
                return false;
            }
            case "openLand":
                return !water && !blocking;
            case "built":
                return !!type && (!!type.build || !!type.ruin);
            case "floorable": {
                if (water || blocking) return false;
                const F = Floors();
                if (F && typeof F.kindAt === "function") {
                    const kind = F.kindAt(x, y);
                    if (kind && kind !== "none" && kind !== "earth" && kind !== "grass" && kind !== "dirt") return false;
                }
                return true;
            }
            case "designations": {
                const I = Interact();
                if (I && typeof I.designationsAt === "function") {
                    return I.designationsAt(x, y, area).length > 0;
                }
                return false;
            }
            default:
                return true;
        }
    }

    //-------------------------------------------------------------------------
    // Commit & Queue
    //-------------------------------------------------------------------------

    const commitQueue = [];

    function queueCommit(toolDef, box) {
        const x0 = Math.min(box.x0, box.x1);
        let x1 = Math.max(box.x0, box.x1);
        const y0 = Math.min(box.y0, box.y1);
        let y1 = Math.max(box.y0, box.y1);

        if (isProvoked("tool_chop_area")) {
            // Provocation: skip box's last row
            y1 = Math.max(y0, y1 - 1);
        }

        const J = Jobs();
        const markedIndex = new Set();
        if (J && typeof J.list === "function") {
            const list = J.list();
            for (const j of list) {
                const jArea = j.area || (j.target && j.target.area);
                const jZ = (typeof j.z === "number" ? j.z : (j.target && typeof j.target.z === "number" ? j.target.z : 0));
                if (jArea && jArea.x === box.area.x && jArea.y === box.area.y && jZ === box.z) {
                    if (j.state === "open" || j.state === "travel" || j.state === "work") {
                        if (j.target) {
                            markedIndex.add(`${j.type}:${j.target.x},${j.target.y}`);
                            if (j.params && j.params.objectId) {
                                markedIndex.add(`build:${j.params.objectId}:${j.target.x},${j.target.y}`);
                            }
                        }
                    }
                }
            }
        }

        commitQueue.push({
            tool: toolDef.id,
            toolDef,
            wall: chosenWall,
            area: copyArea(box.area),
            z: box.z,
            x0, y0, x1, y1,
            curX: x0,
            curY: y0,
            made: 0,
            skipped: {},
            alreadyMarkedIndex: markedIndex,
            totalCandidates: 0
        });
    }

    function processCommits(budgetMs) {
        if (!commitQueue.length) return;
        const curZ = viewZ();
        const W = World();
        const curArea = W ? W.currentArea() : null;
        const cfg = getConfig();
        const maxMarks = cfg.limits.openMarks || 2000;
        const J = Jobs();
        const I = Interact();
        const startTime = performance.now();

        while (commitQueue.length > 0) {
            const c = commitQueue[0];
            // Pause if not on screen area or level
            if (c.z !== curZ || !curArea || c.area.x !== curArea.x || c.area.y !== curArea.y) {
                setStatus(`Paused: cells left on level ${c.z}`);
                break;
            }

            let processedCells = 0;
            const minCells = cfg.budgets.minCellsPerFrame || 16;
            let timeElapsed = 0;

            const isBigRectProvoked = isProvoked("big_rect_frame_time");

            while (c.curY <= c.y1) {
                const x = c.curX;
                const y = c.curY;

                // Move cursor
                c.curX++;
                if (c.curX > c.x1) {
                    c.curX = c.x0;
                    c.curY++;
                }

                processedCells++;

                // 1. Candidate check
                if (!isCandidateCell(c.toolDef, x, y, c.area, c.z)) {
                    continue;
                }
                c.totalCandidates++;

                // 2. Already marked check
                const jobType = c.toolDef.job || c.toolDef.id;
                let alreadyKey = `${jobType}:${x},${y}`;
                if (c.tool === "wall") alreadyKey = `build:${c.wall}:${x},${y}`;
                else if (c.tool === "stockpile") alreadyKey = `build:stockpile:${x},${y}`;

                if (c.alreadyMarkedIndex.has(alreadyKey)) {
                    c.skipped["already marked"] = (c.skipped["already marked"] || 0) + 1;
                    continue;
                }

                // 3. Open designations limit check
                const openCount = J && J.list ? J.list().filter(j => j.owner === null && (j.state === "open" || j.state === "travel" || j.state === "work")).length : 0;
                if (openCount >= maxMarks && !isBigRectProvoked) {
                    c.skipped["limit reached"] = (c.skipped["limit reached"] || 0) + 1;
                    continue;
                }

                // 4. Run through UF_Interact
                if (c.tool === "wall") {
                    const target = { area: copyArea(c.area), x, y, z: c.z };
                    const buildOpts = I && typeof I.buildOptions === "function" ? I.buildOptions(target) : [];
                    const opt = buildOpts.find(o => o.id === `build:${c.wall}` || o.objectId === c.wall);

                    let lockedReason = null;
                    if (window.UF && UF.Tech && typeof UF.Tech.canBuild === "function") {
                        const cb = UF.Tech.canBuild(c.wall);
                        if (cb && !cb.ok) lockedReason = cb.reason;
                    }
                    if (opt && opt.enabled === false && opt.reason) lockedReason = opt.reason;

                    if (isProvoked("tool_obeys_unlocks")) {
                        // Provoke: ignore lock
                        lockedReason = null;
                        if (opt) opt.enabled = true;
                    }

                    if (lockedReason) {
                        c.skipped[lockedReason] = (c.skipped[lockedReason] || 0) + 1;
                    } else if (opt && opt.enabled !== false) {
                        opt.run();
                        c.made++;
                        c.alreadyMarkedIndex.add(alreadyKey);
                    } else {
                        c.skipped["not offered here"] = (c.skipped["not offered here"] || 0) + 1;
                    }
                } else if (c.tool === "stockpile") {
                    // Check if cell already has stockpile object
                    const O = Objects();
                    const existingType = O ? (O.atIn ? O.atIn(c.area, x, y) : O.at(x, y)) : null;
                    if (existingType && existingType.id === "stockpile") {
                        c.made++;
                    } else {
                        const opts = I && typeof I.optionsFor === "function" ? I.optionsFor(x, y) : [];
                        const opt = opts.find(o => o.id === "stockpile");
                        if (opt && opt.enabled !== false) {
                            opt.run();
                            c.made++;
                            c.alreadyMarkedIndex.add(alreadyKey);
                        } else {
                            const r = (opt && opt.reason) || "not offered here";
                            c.skipped[r] = (c.skipped[r] || 0) + 1;
                        }
                    }
                } else {
                    const opts = I && typeof I.optionsFor === "function" ? I.optionsFor(x, y) : [];
                    const opt = opts.find(o => c.toolDef.options.includes(o.id) || o.id === c.toolDef.id);

                    if (!opt) {
                        c.skipped["not offered here"] = (c.skipped["not offered here"] || 0) + 1;
                    } else if (opt.enabled === false && !isProvoked("tool_skips_ineligible")) {
                        let reason = opt.reason;
                        if (!reason) {
                            const m = opt.label.match(/\(([^)]+)\)$/);
                            reason = m ? m[1] : "disabled";
                        }
                        c.skipped[reason] = (c.skipped[reason] || 0) + 1;
                    } else {
                        // Check skill gate hook if available
                        let skillRefusal = null;
                        if (window.UF && UF.Skills && typeof UF.Skills.canWork === "function") {
                            const cw = UF.Skills.canWork(c.toolDef.job || c.toolDef.id, x, y);
                            if (cw && !cw.ok) skillRefusal = cw.reason;
                        }
                        if (skillRefusal && !isProvoked("tool_skips_ineligible")) {
                            c.skipped[skillRefusal] = (c.skipped[skillRefusal] || 0) + 1;
                        } else {
                            opt.run();
                            c.made++;
                            c.alreadyMarkedIndex.add(alreadyKey);
                        }
                    }
                }

                timeElapsed = performance.now() - startTime;
                if (!isBigRectProvoked && processedCells >= minCells && timeElapsed >= budgetMs) {
                    break;
                }
            }

            if (c.curY > c.y1) {
                // Finished this commit!
                finishCommit(c);
                commitQueue.shift();
            }

            if (!isBigRectProvoked && timeElapsed >= budgetMs) {
                break;
            }
        }
    }

    function finishCommit(c) {
        const summary = {
            tool: c.tool,
            made: c.made,
            skipped: Object.assign({}, c.skipped),
            totalCandidates: c.totalCandidates
        };
        lastSummaryData = summary;

        const skipParts = [];
        for (const [r, count] of Object.entries(c.skipped)) {
            skipParts.push(`${count} ${r}`);
        }
        let msg = `${c.toolDef.label}: ${c.made} marked.`;
        if (skipParts.length) {
            msg += ` Skipped: ${skipParts.slice(0, 3).join(", ")}${skipParts.length > 3 ? " and more" : ""}.`;
        }
        setStatus(msg);

        if (c.made > 0) SoundManager.playOk();
        else SoundManager.playBuzzer();

        emit("select:areaCommitted", summary);
    }

    function cancelArea(box) {
        const x0 = Math.min(box.x0, box.x1);
        const x1 = Math.max(box.x0, box.x1);
        let y0 = Math.min(box.y0, box.y1);
        let y1 = Math.max(box.y0, box.y1);

        if (isProvoked("cancel_area")) {
            return;
        }

        const J = Jobs();
        let marksRemoved = 0;
        let zonesCleared = 0;

        if (J && typeof J.list === "function") {
            const list = J.list().slice();
            for (const j of list) {
                const jArea = j.area || (j.target && j.target.area);
                const jZ = (typeof j.z === "number" ? j.z : (j.target && typeof j.target.z === "number" ? j.target.z : 0));
                if (jArea && jArea.x === box.area.x && jArea.y === box.area.y && jZ === box.z) {
                    if (j.owner === null && (j.state === "open" || j.state === "travel" || j.state === "work")) {
                        if (j.target && j.target.x >= x0 && j.target.x <= x1 && j.target.y >= y0 && j.target.y <= y1) {
                            J.cancel(j.id, "cancelled by the player");
                            marksRemoved++;
                        }
                    }
                }
            }
        }

        // Cancel stockpile zone cells
        const st = ensureSelectState();
        if (st && st.zones) {
            for (let i = st.zones.length - 1; i >= 0; i--) {
                const z = st.zones[i];
                if (z.area && z.area.x === box.area.x && z.area.y === box.area.y && (z.z || 0) === box.z) {
                    for (let cy = y0; cy <= y1; cy++) {
                        for (let cx = x0; cx <= x1; cx++) {
                            if (zoneRemoveCell(z, cx, cy)) zonesCleared++;
                        }
                    }
                    if (zoneCountCells(z) === 0) {
                        st.zones.splice(i, 1);
                    }
                }
            }
        }

        const summary = { tool: "cancel", marksRemoved, zonesCleared };
        lastSummaryData = summary;
        setStatus(`Cancel: ${marksRemoved} marks removed, ${zonesCleared} stockpile cells cleared.`);
        if (marksRemoved > 0 || zonesCleared > 0) SoundManager.playOk();
        else SoundManager.playBuzzer();
        emit("select:areaCommitted", summary);
    }

    //-------------------------------------------------------------------------
    // Group move: BFS formation assignment (V68)
    //-------------------------------------------------------------------------

    function groupMove(target) {
        const units = getSelectedUnits();
        if (!units.length) return;

        const W = World(), J = Jobs(), C = Colonists();
        if (!W || !J) return;

        const area = target.area || W.currentArea();
        const tx = target.x, ty = target.y, tz = typeof target.z === "number" ? target.z : viewZ();
        const cfg = getConfig();
        const maxRadius = cfg.limits.formationRadius || 12;

        if (isProvoked("group_move")) {
            // Provoke: send everyone to tx, ty directly!
            for (const u of units) {
                if (C && typeof C.order === "function" && C.isColonist(u)) {
                    C.order(u.id, { type: "move", target: { area, x: tx, y: ty, z: tz } });
                }
            }
            setStatus(`${units.length} moving to target directly (provoked).`);
            SoundManager.playOk();
            return;
        }

        // Check standable cells via BFS
        const memberIds = new Set(units.map(u => u.id));
        const visited = new Set();
        const queue = [];

        function canStep(fromX, fromY, toX, toY) {
            const dx = toX - fromX, dy = toY - fromY;
            if (dx !== 0 && dy !== 0) {
                // Diagonal step: no corner cutting (V3)
                const s1 = J.standable(area, fromX + dx, fromY);
                const s2 = J.standable(area, fromX, fromY + dy);
                if (!s1 || !s2) return false;
            }
            return true;
        }

        queue.push({ x: tx, y: ty, dist: 0 });
        visited.add(`${tx},${ty}`);

        const candidates = [];
        while (queue.length > 0) {
            const cur = queue.shift();
            const cheb = Math.max(Math.abs(cur.x - tx), Math.abs(cur.y - ty));
            if (cheb <= maxRadius) {
                const uOnCell = findUnitAt(cur.x, cur.y, area, target.z || 0);
                const isGroupMember = uOnCell && memberIds.has(uOnCell.id);
                if (J.standable(area, cur.x, cur.y) || isGroupMember) {
                    candidates.push({ x: cur.x, y: cur.y, cheb, euclid: (cur.x - tx) ** 2 + (cur.y - ty) ** 2 });
                }

                // 8 neighbors
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = cur.x + dx, ny = cur.y + dy;
                        const key = `${nx},${ny}`;
                        if (!visited.has(key) && Math.max(Math.abs(nx - tx), Math.abs(ny - ty)) <= maxRadius) {
                            visited.add(key);
                            if (canStep(cur.x, cur.y, nx, ny)) {
                                queue.push({ x: nx, y: ny, dist: cur.dist + 1 });
                            }
                        }
                    }
                }
            }
        }

        // Sort candidates: Chebyshev ring, then Euclidean dist, then y, then x
        candidates.sort((a, b) => {
            if (a.cheb !== b.cheb) return a.cheb - b.cheb;
            if (a.euclid !== b.euclid) return a.euclid - b.euclid;
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });

        // Sort units by distance to T, then id
        const sortedUnits = units.slice().sort((a, b) => {
            const da = (a.x - tx) ** 2 + (a.y - ty) ** 2;
            const db = (b.x - tx) ** 2 + (b.y - ty) ** 2;
            if (da !== db) return da - db;
            return a.id - b.id;
        });

        let movingCount = 0;
        let noCellCount = 0;

        for (let i = 0; i < sortedUnits.length; i++) {
            const u = sortedUnits[i];
            const cell = candidates[i];
            if (cell) {
                let orderedJob = null;
                if (C && typeof C.order === "function" && C.isColonist(u)) {
                    orderedJob = C.order(u.id, { type: "move", target: { area, x: cell.x, y: cell.y, z: tz } });
                }
                if (!orderedJob && J && typeof J.create === "function") {
                    orderedJob = J.create({ type: "move", target: { area, x: cell.x, y: cell.y, z: tz }, owner: u.id, params: { ordered: true } });
                }
                if (orderedJob) movingCount++;
            } else {
                noCellCount++;
            }
        }

        if (movingCount > 0) {
            setTargetedTile(tx, ty);
            SoundManager.playOk();
        } else {
            SoundManager.playBuzzer();
        }

        setStatus(`${movingCount} moving${noCellCount > 0 ? `; ${noCellCount} found no free cell.` : ""}`);
    }

    //-------------------------------------------------------------------------
    // Incremental Preview Calculation
    //-------------------------------------------------------------------------

    function updatePreview(budgetMs) {
        if (!activeBox) return;
        const cfg = getConfig();
        const tDef = cfg.tools.find(t => t.id === activeBox.tool);

        if (!tDef) {
            // Unit selection box: count player units inside
            const W = World();
            if (!W) return;
            const x0 = Math.min(activeBox.x0, activeBox.x1);
            const x1 = Math.max(activeBox.x0, activeBox.x1);
            const y0 = Math.min(activeBox.y0, activeBox.y1);
            const y1 = Math.max(activeBox.y0, activeBox.y1);
            let count = 0;
            const units = W.units ? W.units() : [];
            for (const u of units) {
                if (u.area && u.area.x === activeBox.area.x && u.area.y === activeBox.area.y && (u.z || 0) === activeBox.z) {
                    if (u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1 && isPlayerUnit(u)) {
                        count++;
                    }
                }
            }
            previewCount = count;
            previewDone = true;
            return;
        }

        // Tool preview: count candidate cells not already marked
        if (!previewCache) {
            previewCache = new Uint8Array(256 * 256);
            previewCount = 0;
            previewDone = false;
            previewCursor = 0;
        }

        if (previewDone) return;

        const x0 = Math.min(activeBox.x0, activeBox.x1);
        const x1 = Math.max(activeBox.x0, activeBox.x1);
        const y0 = Math.min(activeBox.y0, activeBox.y1);
        const y1 = Math.max(activeBox.y0, activeBox.y1);
        const totalW = x1 - x0 + 1;
        const totalH = y1 - y0 + 1;
        const totalCells = totalW * totalH;

        const startTime = performance.now();
        const minCells = cfg.budgets.minCellsPerFrame || 16;
        let processed = 0;

        const J = Jobs();
        while (previewCursor < totalCells) {
            const cx = x0 + (previewCursor % totalW);
            const cy = y0 + Math.floor(previewCursor / totalW);
            const cacheIdx = (cy & 255) * 256 + (cx & 255);

            if (previewCache[cacheIdx] === 0) { // Unknown
                if (tDef.id === "cancel") {
                    const I = Interact();
                    const hasMarks = I && typeof I.designationsAt === "function" && I.designationsAt(cx, cy, activeBox.area).length > 0;
                    previewCache[cacheIdx] = hasMarks ? 1 : 3;
                } else if (isCandidateCell(tDef, cx, cy, activeBox.area, activeBox.z)) {
                    // Check if already designated
                    const jobType = tDef.job || tDef.id;
                    const designations = J && J.list ? J.list().some(j => j.owner === null && (j.state === "open" || j.state === "travel" || j.state === "work") && j.target && j.target.x === cx && j.target.y === cy && (j.type === jobType || (tDef.id === "wall" && j.params && j.params.objectId === chosenWall))) : false;
                    previewCache[cacheIdx] = designations ? 2 : 1;
                } else {
                    previewCache[cacheIdx] = 3;
                }
            }

            if (previewCache[cacheIdx] === 1) {
                previewCount++;
            }

            previewCursor++;
            processed++;

            if (processed >= minCells && performance.now() - startTime >= budgetMs) {
                break;
            }
        }

        if (previewCursor >= totalCells) {
            previewDone = true;
        }
    }

    //-------------------------------------------------------------------------
    // Canvas CSS cursor
    //-------------------------------------------------------------------------

    const cursorCache = {};
    function updateCanvasCursor(toolDef) {
        if (!Graphics._canvas) return;
        if (!toolDef) {
            Graphics._canvas.style.cursor = "";
            return;
        }
        if (cursorCache[toolDef.id]) {
            Graphics._canvas.style.cursor = cursorCache[toolDef.id];
            return;
        }

        // Draw 32x32 cursor with crosshair and glyph
        const cvs = document.createElement("canvas");
        cvs.width = 32;
        cvs.height = 32;
        const ctx = cvs.getContext("2d");

        // Crosshair at (15, 15)
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(15, 10); ctx.lineTo(15, 20);
        ctx.moveTo(10, 15); ctx.lineTo(20, 15);
        ctx.stroke();

        ctx.strokeStyle = "#000000";
        ctx.strokeRect(14, 14, 3, 3);

        // Tool glyph dot / box at lower right (20, 20)
        ctx.fillStyle = toolDef.color || "#38bdf8";
        ctx.fillRect(20, 20, 8, 8);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(19.5, 19.5, 9, 9);

        const url = `url(${cvs.toDataURL()}) 15 15, crosshair`;
        cursorCache[toolDef.id] = url;
        Graphics._canvas.style.cursor = url;
    }

    //-------------------------------------------------------------------------
    // Overlay Sprite: Box outline, fill, inset candidates, size label, zones
    //-------------------------------------------------------------------------

    class Sprite_UFSelectOverlay extends Sprite {
        initialize() {
            super.initialize();
            this.bitmap = new Bitmap(Graphics.width, Graphics.height);
            this.z = 25;
            this._lastBoxKey = "";
            this._dirty = true;
        }
        update() {
            super.update();
            this.redraw();
        }
        redraw() {
            const b = this.bitmap;
            if (!b) return;
            b.clear();

            // Hovered tile selector & targeted tile square brackets
            this.drawTileSelector(b);

            const curZ = viewZ();
            const W = World();
            const curArea = W ? W.currentArea() : null;
            const cfg = getConfig();

            // 1. Draw Stockpile Zones overlay when stockpile or cancel tool is on
            if ((activeTool === "stockpile" || activeTool === "cancel") && curArea) {
                const st = ensureSelectState();
                if (st && st.zones) {
                    for (const zone of st.zones) {
                        if (zone.area && zone.area.x === curArea.x && zone.area.y === curArea.y && (zone.z || 0) === curZ) {
                            this.drawZone(zone, b, cfg.colors.zones.stockpile || "#86efac", cfg.colors.zoneAlpha || 0.25);
                        }
                    }
                }
            }

            // 2. Draw Active Box
            if (!activeBox) return;

            const x0 = Math.min(activeBox.x0, activeBox.x1);
            const x1 = Math.max(activeBox.x0, activeBox.x1);
            const y0 = Math.min(activeBox.y0, activeBox.y1);
            const y1 = Math.max(activeBox.y0, activeBox.y1);

            const z = window.UF.Camera ? UF.Camera.zoom() : 1;
            const tileSize = 48 * z;

            const scrX0 = Math.round($gameMap.adjustX(x0) * tileSize);
            const scrY0 = Math.round($gameMap.adjustY(y0) * tileSize);
            const scrX1 = Math.round(($gameMap.adjustX(x1) + 1) * tileSize);
            const scrY1 = Math.round(($gameMap.adjustY(y1) + 1) * tileSize);
            const scrW = scrX1 - scrX0;
            const scrH = scrY1 - scrY0;

            const tDef = cfg.tools.find(t => t.id === activeBox.tool);
            const fillColor = tDef ? tDef.color : cfg.colors.box;
            const fillAlpha = tDef ? cfg.colors.boxFill : cfg.colors.selectFill;

            // Fill
            b.paintOpacity = Math.round(fillAlpha * 255);
            b.fillRect(scrX0, scrY0, scrW, scrH, fillColor);

            // Inset candidate cells in view
            if (tDef) {
                b.paintOpacity = Math.round(cfg.colors.eligible * 255);
                const startTileX = Math.max(x0, Math.floor($gameMap.displayX()));
                const endTileX = Math.min(x1, Math.ceil($gameMap.displayX() + Graphics.width / tileSize));
                const startTileY = Math.max(y0, Math.floor($gameMap.displayY()));
                const endTileY = Math.min(y1, Math.ceil($gameMap.displayY() + Graphics.height / tileSize));

                for (let ty = startTileY; ty <= endTileY; ty++) {
                    for (let tx = startTileX; tx <= endTileX; tx++) {
                        if (isCandidateCell(tDef, tx, ty, activeBox.area, activeBox.z)) {
                            const csx = Math.round($gameMap.adjustX(tx) * tileSize) + 2;
                            const csy = Math.round($gameMap.adjustY(ty) * tileSize) + 2;
                            b.fillRect(csx, csy, tileSize - 4, tileSize - 4, tDef.color);
                        }
                    }
                }
            }

            // Box outline (2px white with 1px dark edge)
            b.paintOpacity = 255;
            b.strokeRect(scrX0 - 1, scrY0 - 1, scrW + 2, scrH + 2, "#0f172a", 1);
            b.strokeRect(scrX0, scrY0, scrW, scrH, cfg.colors.box || "#f8fafc", 2);

            // 3. Draw Size Label
            const totalW = x1 - x0 + 1;
            const totalH = y1 - y0 + 1;
            let labelX = TouchInput.x + 14;
            let labelY = TouchInput.y + 14;
            const labelW = 120;
            const labelH = 40;
            if (labelX + labelW > Graphics.width - 8) labelX = TouchInput.x - labelW - 14;
            if (labelY + labelH > Graphics.height - 8) labelY = TouchInput.y - labelH - 14;

            b.fillRect(labelX, labelY, labelW, labelH, "rgba(15, 23, 42, 0.85)");
            b.strokeRect(labelX, labelY, labelW, labelH, "#cbd5e1", 1);

            b.fontSize = 12;
            b.textColor = "#f8fafc";
            b.drawText(`${totalW} × ${totalH}`, labelX + 6, labelY + 2, labelW - 12, 16, "left");

            let countText = "";
            if (!tDef) countText = `${previewCount} units`;
            else if (tDef.id === "cancel") countText = `${previewCount} marks`;
            else countText = `${previewCount} cells`;
            if (!previewDone) countText += ", counting…";

            b.fontSize = 11;
            b.textColor = "#94a3b8";
            b.drawText(countText, labelX + 6, labelY + 20, labelW - 12, 16, "left");
        }

        drawZone(zone, b, color, alpha) {
            const z = window.UF.Camera ? UF.Camera.zoom() : 1;
            const tileSize = 48 * z;
            const startX = Math.max(zone.x0, Math.floor($gameMap.displayX()));
            const endX = Math.min(zone.x0 + zone.w - 1, Math.ceil($gameMap.displayX() + Graphics.width / tileSize));
            const startY = Math.max(zone.y0, Math.floor($gameMap.displayY()));
            const endY = Math.min(zone.y0 + zone.h - 1, Math.ceil($gameMap.displayY() + Graphics.height / tileSize));

            b.paintOpacity = Math.round(alpha * 255);
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    if (zoneHasCell(zone, x, y)) {
                        const sx = Math.round($gameMap.adjustX(x) * tileSize);
                        const sy = Math.round($gameMap.adjustY(y) * tileSize);
                        b.fillRect(sx, sy, tileSize, tileSize, color);
                    }
                }
            }
            // Zone label
            const lx = Math.round($gameMap.adjustX(zone.x0) * tileSize);
            const ly = Math.round($gameMap.adjustY(zone.y0) * tileSize);
            b.paintOpacity = 255;
            b.fontSize = 11;
            b.textColor = "#0f172a";
            b.drawText(zone.name, lx + 2, ly + 2, 100, 14, "left");
        }

        drawTileSelector(b) {
            if (!window.$gameMap || !window.$dataMap) return;
            const look = window.UF && UF.Look;
            if (look && typeof look.isOverUI === "function" && look.isOverUI()) return;

            const z = window.UF.Camera ? UF.Camera.zoom() : 1;
            const tileSize = 48 * z;

            // 1. Hovered tile: translucent white selector
            const hx = $gameMap.canvasToMapX(TouchInput.x);
            const hy = $gameMap.canvasToMapY(TouchInput.y);
            const isHoveredValid = $gameMap.isValid(hx, hy) && TouchInput.x >= 0 && TouchInput.x < Graphics.width && TouchInput.y >= 0 && TouchInput.y < Graphics.height;

            if (isHoveredValid) {
                const sx = Math.round($gameMap.adjustX(hx) * tileSize);
                const sy = Math.round($gameMap.adjustY(hy) * tileSize);
                const sw = Math.round(($gameMap.adjustX(hx) + 1) * tileSize) - sx;
                const sh = Math.round(($gameMap.adjustY(hy) + 1) * tileSize) - sy;

                if (sx + sw > 0 && sy + sh > 0 && sx < Graphics.width && sy < Graphics.height) {
                    // Translucent white fill
                    b.fillRect(sx, sy, sw, sh, "rgba(255, 255, 255, 0.22)");
                    // Inset crisp white border
                    b.fillRect(sx, sy, sw, 1, "rgba(255, 255, 255, 0.65)");
                    b.fillRect(sx, sy + sh - 1, sw, 1, "rgba(255, 255, 255, 0.65)");
                    b.fillRect(sx, sy, 1, sh, "rgba(255, 255, 255, 0.65)");
                    b.fillRect(sx + sw - 1, sy, 1, sh, "rgba(255, 255, 255, 0.65)");
                }
            }

            // 2. Targeted tile: square brackets [ ]
            const tgt = this.currentActiveTargetTile();
            if (tgt && $gameMap.isValid(tgt.x, tgt.y)) {
                const tsx = Math.round($gameMap.adjustX(tgt.x) * tileSize);
                const tsy = Math.round($gameMap.adjustY(tgt.y) * tileSize);
                const tsw = Math.round(($gameMap.adjustX(tgt.x) + 1) * tileSize) - tsx;
                const tsh = Math.round(($gameMap.adjustY(tgt.y) + 1) * tileSize) - tsy;

                if (tsx + tsw > 0 && tsy + tsh > 0 && tsx < Graphics.width && tsy < Graphics.height) {
                    this.drawSquareBrackets(b, tsx, tsy, tsw, tsh, z);
                }
            }
        }

        drawSquareBrackets(b, x, y, w, h, z) {
            const arm = Math.max(8, Math.round(12 * z));
            const thick = Math.max(2, Math.round(3 * z));

            // Dark drop-shadow outline for high contrast against any terrain
            const sArm = arm + 1;
            const sThick = thick + 2;
            const sColor = "rgba(0, 0, 0, 0.80)";

            // Left bracket shadow [
            b.fillRect(x - 1, y - 1, sArm, sThick, sColor);
            b.fillRect(x - 1, y - 1, sThick, h + 2, sColor);
            b.fillRect(x - 1, y + h - sThick + 1, sArm, sThick, sColor);

            // Right bracket shadow ]
            b.fillRect(x + w - sArm + 1, y - 1, sArm, sThick, sColor);
            b.fillRect(x + w - sThick + 1, y - 1, sThick, h + 2, sColor);
            b.fillRect(x + w - sArm + 1, y + h - sThick + 1, sArm, sThick, sColor);

            // Bright white square brackets
            const bracketColor = "#ffffff";
            // Left bracket: [
            b.fillRect(x, y, arm, thick, bracketColor);
            b.fillRect(x, y, thick, h, bracketColor);
            b.fillRect(x, y + h - thick, arm, thick, bracketColor);

            // Right bracket: ]
            b.fillRect(x + w - arm, y, arm, thick, bracketColor);
            b.fillRect(x + w - thick, y, thick, h, bracketColor);
            b.fillRect(x + w - arm, y + h - thick, arm, thick, bracketColor);
        }

        currentActiveTargetTile() {
            if (window.UF && UF.Target && UF.Target.targetedTile()) {
                return UF.Target.targetedTile();
            }
            if (window.$colonyManager && $colonyManager.selectedColonist) {
                const sel = $colonyManager.selectedColonist;
                const u = sel.unit;
                if (u && u.goal && u.goal.x !== undefined && u.goal.y !== undefined) {
                    return { x: u.goal.x, y: u.goal.y };
                }
                const J = window.UF && UF.Jobs;
                const job = J ? J.of(sel.id) : null;
                if (job && job.target && job.target.x !== undefined && job.target.y !== undefined) {
                    return { x: job.target.x, y: job.target.y };
                }
            }
            return null;
        }
    }

    //-------------------------------------------------------------------------
    // Toolbar Sprite (12 buttons directly left of speed widget on same row)
    //-------------------------------------------------------------------------

    class Sprite_UFSelectToolbar extends Sprite {
        initialize() {
            super.initialize();
            this.width = 344;
            this.height = 32;
            this.bitmap = new Bitmap(this.width, this.height);
            this.x = 264;
            this.y = 42;
            this.z = 90;
            this._lastActive = null;
            this.redraw();
        }
        update() {
            super.update();
            this.updatePosition();
            if (activeTool !== this._lastActive) {
                this._lastActive = activeTool;
                this.redraw();
            }
            this.handleClicks();
        }
        updatePosition() {
            const scene = SceneManager._scene;
            const speedWidget = scene && scene._ufTimeSpeedWidget;
            if (speedWidget && speedWidget.visible) {
                this.x = speedWidget.x - this.width - 8;
                this.y = speedWidget.y;
            } else {
                this.x = 264;
                this.y = 42;
            }
        }
        redraw() {
            const b = this.bitmap;
            if (!b) return;
            b.clear();

            const cfg = getConfig();
            const btnW = 26, btnH = 26, pitch = 28;

            // Button 0: Select (no tool)
            this.drawButton(0, null, "□", "", activeTool === null);

            // Buttons 1-11: Tools
            cfg.tools.forEach((t, i) => {
                this.drawButton(i + 1, t, t.key, t.key, activeTool === t.id);
            });
        }
        drawButton(idx, toolDef, glyph, keyLetter, isActive) {
            const b = this.bitmap;
            const x = idx * 28 + 2;
            const y = 3;
            const w = 26, h = 26;

            // Background
            b.fillRect(x, y, w, h, isActive ? "#334155" : "rgba(15, 23, 42, 0.75)");
            b.strokeRect(x, y, w, h, isActive ? (toolDef ? toolDef.color : "#38bdf8") : "#64748b", isActive ? 2 : 1);

            // Glyph
            b.fontSize = 11;
            b.textColor = toolDef ? toolDef.color : "#f8fafc";
            b.drawText(glyph, x, y + 2, w, 14, "center");

            // Key letter
            if (keyLetter) {
                b.fontSize = 9;
                b.textColor = "#94a3b8";
                b.drawText(keyLetter, x + w - 9, y + h - 11, 8, 10, "right");
            }
        }
        handleClicks() {
            if (!TouchInput.isTriggered()) return;
            const mx = TouchInput.x - this.x;
            const my = TouchInput.y - this.y;
            if (mx >= 0 && mx < this.width && my >= 0 && my < this.height) {
                const btnIdx = Math.floor(mx / 28);
                const cfg = getConfig();
                if (btnIdx === 0) {
                    setTool(null);
                    SoundManager.playCursor();
                } else if (btnIdx >= 1 && btnIdx <= cfg.tools.length) {
                    const t = cfg.tools[btnIdx - 1];
                    if (t.id === "wall") {
                        handleWallToolTrigger();
                    } else {
                        setTool(activeTool === t.id ? null : t.id);
                    }
                    SoundManager.playCursor();
                }
                // Consume click
                TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false });
            }
        }
    }

    //-------------------------------------------------------------------------
    // Status line sprite (under toolbar)
    //-------------------------------------------------------------------------

    class Sprite_UFSelectStatus extends Sprite {
        initialize() {
            super.initialize();
            this.width = 232;
            this.height = 36;
            this.bitmap = new Bitmap(this.width, this.height);
            this.x = 264;
            this.y = 78;
            this.z = 90;
            this._drawnText = "";
        }
        update() {
            super.update();
            const scene = SceneManager._scene;
            const tb = scene && scene._ufSelectToolbar;
            if (tb) {
                this.x = tb.x;
                this.y = tb.y + 36;
            }
            if (statusTimer > 0) {
                statusTimer--;
                if (statusTimer === 0 && !activeTool) {
                    statusText = "";
                }
            }
            if (this._drawnText !== statusText) {
                this._drawnText = statusText;
                this.redraw();
            }
        }
        redraw() {
            const b = this.bitmap;
            if (!b) return;
            b.clear();
            if (!statusText) return;

            b.fontSize = 11;
            b.textColor = "#e2e8f0";
            b.drawText(statusText, 0, 0, this.width, 16, "left");
        }
    }

    //-------------------------------------------------------------------------
    // Group Strip Window (above colonist card)
    //-------------------------------------------------------------------------

    class Window_UFGroupStrip extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 220;
            this._lastCount = -1;
            this._lastPrimaryId = -1;
        }
        update() {
            super.update();
            this.updateVisibilityAndPosition();
            if (Graphics.frameCount % 30 === 0) this.refresh();
        }
        updateVisibilityAndPosition() {
            const scene = SceneManager._scene;
            const card = scene && scene._colonyCard;
            if (selectedGroup.length >= 2 && card && card.visible) {
                this.visible = true;
                this.x = card.x;
                this.y = card.y - this.height - 4;
            } else {
                this.visible = false;
            }
        }
        refresh() {
            const prim = primaryUnit();
            const primId = prim ? prim.id : -1;
            if (this._lastCount === selectedGroup.length && this._lastPrimaryId === primId) return;
            this._lastCount = selectedGroup.length;
            this._lastPrimaryId = primId;

            this.contents.clear();
            if (selectedGroup.length < 2) return;

            this.contents.fontSize = 12;
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(`${selectedGroup.length} selected · Esc clears`, 6, 2, this.contentsWidth() - 12, "left");

            const W = World();
            const names = selectedGroup.map(id => {
                const u = W ? W.unit(id) : null;
                return { id, name: u ? u.name : `Unit #${id}` };
            });

            this.contents.fontSize = 11;
            let curX = 6;
            const lineY = 20;
            const maxNames = 12;
            const displayNames = names.slice(0, maxNames);

            for (let i = 0; i < displayNames.length; i++) {
                const item = displayNames[i];
                const isPrim = item.id === primId;
                this.changeTextColor(isPrim ? ColorManager.systemColor() : "#f8fafc");
                const w = this.contents.measureTextWidth(item.name);
                this.drawText(item.name, curX, lineY, w, 14, "left");
                curX += w;

                if (i < displayNames.length - 1 || names.length > maxNames) {
                    this.changeTextColor("#64748b");
                    this.drawText(" · ", curX, lineY, 14, 14, "left");
                    curX += 14;
                }
            }
            if (names.length > maxNames) {
                this.changeTextColor("#94a3b8");
                this.drawText(`+${names.length - maxNames} more`, curX, lineY, 80, 14, "left");
            }
        }
    }

    //-------------------------------------------------------------------------
    // Wall Picker Window
    //-------------------------------------------------------------------------

    class Window_UFWallPicker extends Window_Command {
        initialize(rect, options) {
            this._wallOptions = options || [];
            super.initialize(rect);
            this.opacity = 240;
        }
        makeCommandList() {
            for (const opt of this._wallOptions) {
                this.addCommand(opt.label, opt.id, opt.enabled !== false, opt.objectId);
            }
        }
    }

    function handleWallToolTrigger() {
        const I = Interact(), W = World();
        const area = W ? W.currentArea() : { x: 0, y: 0 };
        const target = { area, x: Math.floor($gameMap.displayX() + 8), y: Math.floor($gameMap.displayY() + 6), z: viewZ() };
        const buildOpts = I && typeof I.buildOptions === "function" ? I.buildOptions(target) : [];
        const wallOpts = buildOpts.filter(o => o.objectId && (o.objectId.startsWith("wall_") || o.objectId === "wall"));

        if (!wallOpts.length) {
            setTool("wall");
            return;
        }
        if (wallOpts.length === 1) {
            chosenWall = wallOpts[0].objectId;
            setTool(activeTool === "wall" ? null : "wall");
            return;
        }

        const scene = SceneManager._scene;
        if (!scene) return;
        if (scene._ufWallPickerWindow) {
            scene.removeChild(scene._ufWallPickerWindow);
            scene._ufWallPickerWindow.destroy();
            scene._ufWallPickerWindow = null;
            return;
        }

        const rect = new Rectangle(scene._ufSelectToolbar ? scene._ufSelectToolbar.x + 200 : 300, 80, 260, 120);
        const win = new Window_UFWallPicker(rect, wallOpts);
        win.setHandler("ok", () => {
            const sym = win.currentSymbol();
            const chosen = wallOpts.find(o => o.id === sym);
            if (chosen) {
                let lockedReason = null;
                if (window.UF && UF.Tech && typeof UF.Tech.canBuild === "function") {
                    const cb = UF.Tech.canBuild(chosen.objectId);
                    if (cb && !cb.ok) lockedReason = cb.reason;
                }
                if (chosen.enabled === false && chosen.reason) lockedReason = chosen.reason;

                if (lockedReason) {
                    setStatus(`Cannot build ${chosen.label}: ${lockedReason}`);
                    SoundManager.playBuzzer();
                } else {
                    chosenWall = chosen.objectId;
                    setTool("wall");
                    SoundManager.playOk();
                }
            }
            scene.removeChild(win);
            win.destroy();
            scene._ufWallPickerWindow = null;
        });
        win.setHandler("cancel", () => {
            scene.removeChild(win);
            win.destroy();
            scene._ufWallPickerWindow = null;
        });
        scene.addChild(win);
        scene._ufWallPickerWindow = win;
    }

    //-------------------------------------------------------------------------
    // Selection Marker Layer (Unit selection corners)
    //-------------------------------------------------------------------------

    class UnitSelectionMarkers {
        constructor(tilemap) {
            this._tilemap = tilemap;
            this._sprites = [];
        }
        sync() {
            if (!this._tilemap) return;
            const W = World();
            if (!W) return;

            const selectedUnits = getSelectedUnits();
            const curZ = viewZ();

            // Check if UF_Stance already drew one selection marker
            let stanceEvent = null;
            if (Stance() && typeof Stance().selectedCharacter === "function") {
                stanceEvent = Stance().selectedCharacter();
            }

            let spriteIdx = 0;
            for (const u of selectedUnits) {
                if ((u.z || 0) !== curZ) continue;
                const ev = u.event || (W.eventOf ? W.eventOf(u.id) : null);
                if (!ev) continue;
                if (stanceEvent && stanceEvent === ev) {
                    // UF_Stance already marks this primary unit
                    continue;
                }

                let s = this._sprites[spriteIdx];
                if (!s) {
                    s = new Sprite();
                    this._tilemap.addChild(s);
                    this._sprites.push(s);
                }
                s.visible = true;

                if (Stance() && typeof Stance().placeSelection === "function") {
                    Stance().placeSelection(s, ev);
                } else {
                    // Fallback marker
                    if (!s.bitmap) {
                        s.bitmap = new Bitmap(48, 48);
                        s.bitmap.strokeRect(4, 4, 40, 40, "#ffffff", 2);
                        s.anchor.set(0.5, 1);
                    }
                    s.x = ev.screenX();
                    s.y = ev.screenY();
                    s.z = 20;
                }
                spriteIdx++;
            }

            for (let i = spriteIdx; i < this._sprites.length; i++) {
                this._sprites[i].visible = false;
            }
        }
    }

    //-------------------------------------------------------------------------
    // Right-Click Menu Wrap (Options for Selection)
    //-------------------------------------------------------------------------

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);

        // Wrap UF.Interact.optionsFor
        const I = Interact();
        if (I && typeof I.optionsFor === "function") {
            const _optionsFor = I.optionsFor;
            I.optionsFor = function(x, y) {
                const opts = _optionsFor.call(this, x, y);
                const sel = selectedGroup.slice();
                if (sel.length >= 1) {
                    const count = sel.length;
                    const W = World();
                    const area = W ? W.currentArea() : null;

                    // 1. Move here (N) - top of list
                    const moveOpt = {
                        id: "select:move_here",
                        label: count > 1 ? `Move here (${count})` : "Move here",
                        enabled: true,
                        run: () => {
                            groupMove({ area, x, y, z: viewZ() });
                        }
                    };
                    opts.unshift(moveOpt);

                    // 2. Wrap Drink here
                    const drinkOpt = opts.find(o => o.id === "drink");
                    if (drinkOpt) {
                        drinkOpt.label = `Drink here (${count})`;
                        const origRun = drinkOpt.run;
                        drinkOpt.run = () => {
                            const C = Colonists();
                            for (const uid of sel) {
                                const u = W ? W.unit(uid) : null;
                                if (u && C && typeof C.order === "function" && C.isColonist(u)) {
                                    C.order(uid, { type: "drink", target: { area, x, y, z: viewZ() } });
                                }
                            }
                        };
                    }

                    // 3. Wrap Fish here
                    const fishOpt = opts.find(o => o.id === "fish");
                    if (fishOpt) {
                        fishOpt.label = `Fish here (${count})`;
                        fishOpt.run = () => {
                            const C = Colonists();
                            for (const uid of sel) {
                                const u = W ? W.unit(uid) : null;
                                if (u && C && typeof C.order === "function" && C.isColonist(u)) {
                                    C.order(uid, { type: "fish", target: { area, x, y, z: viewZ() } });
                                }
                            }
                        };
                    }

                    // 4. Wrap Hunt
                    const huntOpt = opts.find(o => o.id === "hunt");
                    if (huntOpt) {
                        const m = huntOpt.label.match(/^Hunt (.*)$/);
                        const targetName = m ? m[1] : "prey";
                        huntOpt.label = `Hunt ${targetName} (${count})`;
                        const L = Look();
                        const hit = L && L.unitAt ? L.unitAt(x, y) : null;
                        const preyId = hit && hit.unit ? hit.unit.id : null;
                        huntOpt.run = () => {
                            const C = Colonists();
                            for (const uid of sel) {
                                const u = W ? W.unit(uid) : null;
                                if (u && C && typeof C.order === "function" && C.isColonist(u)) {
                                    C.order(uid, { type: "hunt", target: { area, x, y, z: viewZ() }, params: { unitId: preyId } });
                                }
                            }
                        };
                    }
                }
                return opts;
            };
        }

        // Wrap $colonyManager.prototype.select & deselect
        const cm = window.$colonyManager;
        const cmProto = (cm && cm.constructor && cm.constructor.prototype) || (window.ColonyManager && ColonyManager.prototype);
        if (cmProto) {
            const _cm_select = cmProto.select;
            cmProto.select = function(colonist) {
                _cm_select.call(this, colonist);
                if (!syncingOverseer && colonist && typeof colonist === "object") {
                    if (!selectedGroup.includes(colonist.id)) {
                        selectedGroup = [colonist.id];
                        emit("select:changed", selectedGroup.slice());
                    }
                }
            };
            const _cm_deselect = cmProto.deselect;
            cmProto.deselect = function() {
                _cm_deselect.call(this);
                if (!syncingOverseer) {
                    selectedGroup = [];
                    emit("select:changed", []);
                }
            };
        }

        // Register checks
        if (window.UF && UF.Test && UF.Test.active) {
            registerSelectChecks();
        }
    };

    //-------------------------------------------------------------------------
    // Scene_Map Hooks
    //-------------------------------------------------------------------------

    const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);

        this._ufSelectToolbar = new Sprite_UFSelectToolbar();
        this.addChild(this._ufSelectToolbar);

        this._ufSelectStatus = new Sprite_UFSelectStatus();
        this.addChild(this._ufSelectStatus);

        const card = this._colonyCard;
        const rect = new Rectangle(card ? card.x : 20, card ? card.y - 48 : 400, 380, 44);
        this._ufGroupStrip = new Window_UFGroupStrip(rect);
        this.addChild(this._ufGroupStrip);
    };

    const _Scene_Map_isAnyWindowUnderMouse = Scene_Map.prototype.isAnyWindowUnderMouse;
    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        if (_Scene_Map_isAnyWindowUnderMouse && _Scene_Map_isAnyWindowUnderMouse.call(this)) return true;
        const tb = this._ufSelectToolbar;
        if (tb && tb.visible) {
            if (TouchInput.x >= tb.x && TouchInput.x < tb.x + tb.width && TouchInput.y >= tb.y && TouchInput.y < tb.y + tb.height) return true;
        }
        const gs = this._ufGroupStrip;
        if (gs && gs.visible) {
            if (TouchInput.x >= gs.x && TouchInput.x < gs.x + gs.width && TouchInput.y >= gs.y && TouchInput.y < gs.y + gs.height) return true;
        }
        const wp = this._ufWallPickerWindow;
        if (wp && wp.visible) {
            if (TouchInput.x >= wp.x && TouchInput.x < wp.x + wp.width && TouchInput.y >= wp.y && TouchInput.y < wp.y + wp.height) return true;
        }
        return false;
    };

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufSelectionMarkers = new UnitSelectionMarkers(this._tilemap);
        this._ufSelectOverlay = new Sprite_UFSelectOverlay();
        this.addChild(this._ufSelectOverlay);
    };

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        if (this._ufSelectionMarkers) this._ufSelectionMarkers.sync();
    };

    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        cancelBox("scene ended");
        updateCanvasCursor(null);
        _Scene_Map_terminate.call(this);
    };

    // Pre and Post update on Scene_Map
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        const frameStart = performance.now();

        // 2. Pre-update: Click Replay injection
        if (replayingClick && replayData) {
            TouchInput._currentState.triggered = true;
            savedPointer = { x: TouchInput.x, y: TouchInput.y };
            TouchInput._x = replayData.x;
            TouchInput._y = replayData.y;
            replayingClick = false;
        }

        // 3. Esc and Tool Keys
        if (!isMapBusy()) {
            // Esc handling
            if (Input.isTriggered("escape")) {
                if (gestureState === "dragging" || activeBox) {
                    cancelBox("Esc pressed");
                    Input._latestButton = null;
                } else if (activeTool) {
                    setTool(null);
                    Input._latestButton = null;
                } else if (this._ufWallPickerWindow) {
                    this.removeChild(this._ufWallPickerWindow);
                    this._ufWallPickerWindow.destroy();
                    this._ufWallPickerWindow = null;
                    Input._latestButton = null;
                } else if (selectedGroup.length > 0) {
                    clearSelection();
                    Input._latestButton = null;
                }
            }

            // Tool keys (if not dragging)
            if (gestureState !== "dragging") {
                const cfg = getConfig();
                for (const t of cfg.tools) {
                    const actionName = `uf_select_${t.id}`;
                    if (Input.isTriggered(actionName)) {
                        if (t.id === "wall") {
                            handleWallToolTrigger();
                        } else {
                            setTool(activeTool === t.id ? null : t.id);
                        }
                        SoundManager.playCursor();
                        break;
                    }
                }
            }
        }

        // 4. Lost button check
        if (gestureState === "dragging" && !TouchInput.isPressed()) {
            commitActiveBox();
        } else if (gestureState === "pending" && (TouchInput.isReleased() || !TouchInput.isPressed())) {
            // Slow click release
            const p = pendingGesture;
            gestureState = "idle";
            pendingGesture = null;

            const W = World();
            const curZ = viewZ();

            if (activeTool) {
                const cfg = getConfig();
                const tDef = cfg.tools.find(t => t.id === activeTool);
                if (tDef) {
                    queueCommit(tDef, { x0: p.mx, y0: p.my, x1: p.mx, y1: p.my, z: p.z, area: p.area, shift: false, tool: activeTool });
                }
            } else if (p.shift) {
                const u = findUnitAt(p.mx, p.my, p.area, p.z);
                if (u && isPlayerUnit(u)) {
                    if (selectedGroup.includes(u.id)) {
                        selectedGroup = selectedGroup.filter(id => id !== u.id);
                    } else {
                        selectedGroup.push(u.id);
                    }
                    syncOverseerSelection();
                    emit("select:changed", selectedGroup.slice());
                }
            } else if (selectedGroup.length >= 2) {
                const u = findUnitAt(p.mx, p.my, p.area, p.z);
                if (!u || !isPlayerUnit(u)) {
                    groupMove({ area: p.area, x: p.mx, y: p.my, z: p.z });
                }
            } else if (!isProvoked("plain_click")) {
                const u = findUnitAt(p.mx, p.my, p.area, p.z);
                if (u && isPlayerUnit(u)) {
                    setSelection([u.id]);
                    SoundManager.playCursor();
                } else if (selectedGroup.length === 1) {
                    const uid = selectedGroup[0];
                    const selU = W ? W.unit(uid) : null;
                    if (selU) {
                        const C = Colonists();
                        const J = Jobs();
                        let ordered = null;
                        if (C && typeof C.order === "function" && C.isColonist(selU)) {
                            ordered = C.order(uid, { type: "move", target: { area: p.area, x: p.mx, y: p.my, z: p.z } });
                        }
                        if (!ordered && J && typeof J.create === "function") {
                            ordered = J.create({ type: "move", target: { area: p.area, x: p.mx, y: p.my, z: p.z }, owner: uid, params: { ordered: true } });
                        }
                        if (ordered) {
                            setTargetedTile(p.mx, p.my);
                            SoundManager.playOk();
                        }
                    }
                } else {
                    replayingClick = true;
                    replayData = { x: p.sx, y: p.sy };
                }
            }
        }

        // Run core update
        _Scene_Map_update.call(this);

        // 5. Post-update: Drag tracking & Preview
        const W = World();
        const curArea = W ? W.currentArea() : null;
        const curZ = viewZ();

        if (gestureState === "pending" && pendingGesture) {
            const mx = $gameMap.canvasToMapX(TouchInput.x);
            const my = $gameMap.canvasToMapY(TouchInput.y);
            if (mx !== pendingGesture.mx || my !== pendingGesture.my) {
                // Transition to dragging
                gestureState = "dragging";
                activeBox = {
                    x0: pendingGesture.mx,
                    y0: pendingGesture.my,
                    x1: mx,
                    y1: my,
                    z: pendingGesture.z,
                    area: copyArea(pendingGesture.area),
                    shift: pendingGesture.shift,
                    tool: activeTool
                };
                previewCache = null;
                previewCount = 0;
                previewDone = false;
                previewCursor = 0;

                const L = Look();
                if (L && typeof L.enabled !== "undefined") L.enabled = false;
                emit("select:boxStarted", Object.assign({}, activeBox));
            }
        } else if (gestureState === "dragging" && activeBox) {
            // Check canvas boundaries
            if (!Graphics.isInsideCanvas(TouchInput.x, TouchInput.y)) {
                cancelBox("the pointer left the map");
            } else if (!isProvoked("level_scope") && activeBox.z !== curZ) {
                cancelBox("the level changed");
            } else {
                activeBox.x1 = $gameMap.canvasToMapX(TouchInput.x);
                activeBox.y1 = $gameMap.canvasToMapY(TouchInput.y);
                updatePreview(getConfig().budgets.previewMs || 2);
            }
        }

        // 6. Commit queue processing
        processCommits(getConfig().budgets.commitMs || 3);

        // 7. Prune selection every 60 frames
        if (Graphics.frameCount % 60 === 0 && selectedGroup.length > 0 && W) {
            selectedGroup = selectedGroup.filter(id => {
                const u = W.unit(id);
                return u && isPlayerUnit(u) && !u.isDead;
            });
        }

        // Restore replayed pointer if any
        if (savedPointer) {
            TouchInput._x = savedPointer.x;
            TouchInput._y = savedPointer.y;
            savedPointer = null;
        }

        const elapsed = performance.now() - frameStart;
        perfStats.frames++;
        if (elapsed > perfStats.worstFrameMs) perfStats.worstFrameMs = elapsed;
    };

    function commitActiveBox() {
        if (!activeBox) {
            gestureState = "idle";
            pendingGesture = null;
            return;
        }

        const box = Object.assign({}, activeBox);
        const L = Look();
        if (L && typeof L.enabled !== "undefined") L.enabled = true;
        gestureState = "idle";
        activeBox = null;
        pendingGesture = null;

        const cfg = getConfig();
        const tDef = cfg.tools.find(t => t.id === box.tool);

        if (!tDef) {
            // Box selection of units
            const W = World();
            if (!W) return;
            const x0 = Math.min(box.x0, box.x1);
            const x1 = Math.max(box.x0, box.x1);
            const y0 = Math.min(box.y0, box.y1);
            const y1 = Math.max(box.y0, box.y1);

            const unitsInside = [];
            window._lastCommittedBox = { x0, x1, y0, y1, box_x0: box.x0, box_x1: box.x1, tool: box.tool, shift: box.shift };
            const allUnits = W.units ? W.units() : [];
            for (const u of allUnits) {
                if (u.area && u.area.x === box.area.x && u.area.y === box.area.y && (u.z || 0) === box.z) {
                    if (u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1 && isPlayerUnit(u)) {
                        unitsInside.push(u.id);
                    }
                }
            }

            const isShift = box.shift && !isProvoked("shift_adds");
            if (isShift) {
                setSelection(unitsInside, { add: true });
            } else {
                setSelection(unitsInside, { add: false });
            }
            SoundManager.playCursor();
        } else if (tDef.id === "cancel") {
            cancelArea(box);
        } else {
            // Check if stockpile zone
            if (tDef.zone === "stockpile") {
                const st = ensureSelectState();
                if (st) {
                    const x0 = Math.min(box.x0, box.x1);
                    const x1 = Math.max(box.x0, box.x1);
                    const y0 = Math.min(box.y0, box.y1);
                    const y1 = Math.max(box.y0, box.y1);
                    const w = x1 - x0 + 1, h = y1 - y0 + 1;
                    const bytes = new Uint8Array(Math.ceil((w * h) / 8));

                    for (let cy = y0; cy <= y1; cy++) {
                        for (let cx = x0; cx <= x1; cx++) {
                            if (isCandidateCell(tDef, cx, cy, box.area, box.z)) {
                                const idx = (cy - y0) * w + (cx - x0);
                                bytes[Math.floor(idx / 8)] |= (1 << (idx % 8));
                            }
                        }
                    }

                    if (!isProvoked("zone_saved")) {
                        const num = st.nextZone.stockpile++;
                        const zoneRec = {
                            id: `zone_stockpile_${num}`,
                            kind: "stockpile",
                            name: `Stockpile ${num}`,
                            area: copyArea(box.area),
                            z: box.z,
                            x0, y0, w, h,
                            cells: bitsetEncode(bytes),
                            stores: []
                        };
                        st.zones.push(zoneRec);
                        emit("select:zoneCreated", zoneRec);
                    }
                }
            }

            queueCommit(tDef, box);
        }
    }

    // Track shiftKey from mouse events
    if (typeof TouchInput._onMouseDown === "function") {
        const _TouchInput_onMouseDown = TouchInput._onMouseDown;
        TouchInput._onMouseDown = function(event) {
            this._shiftKey = !!event.shiftKey;
            _TouchInput_onMouseDown.call(this, event);
        };
    }

    // Alias updateOverseerControls for input claim and right-click
    if (typeof Scene_Map.prototype.updateOverseerControls === "function") {
        const _updateOverseerControls = Scene_Map.prototype.updateOverseerControls;
        Scene_Map.prototype.updateOverseerControls = function() {
            // 1. Right-Click handling
            if (TouchInput.isCancelled()) {
                const I = Interact();
                const menuOpen = I && typeof I.isOpen === "function" && I.isOpen();
                if (!menuOpen) {
                    if (gestureState === "dragging" || activeBox) {
                        cancelBox("Right-click");
                        if (!isProvoked("leave_tool")) {
                            TouchInput._currentState = Object.assign({}, TouchInput._currentState, { cancelled: false });
                        }
                        return;
                    } else if (activeTool) {
                        setTool(null);
                        if (!isProvoked("leave_tool")) {
                            TouchInput._currentState = Object.assign({}, TouchInput._currentState, { cancelled: false });
                        }
                        return;
                    }
                }
            }

            // 2. Left-Press / Click claim
            if (TouchInput.isTriggered()) {
                const overUI = pointerOverUI();
                const busy = isMapBusy();
                const W = World();
                const mx = $gameMap.canvasToMapX(TouchInput.x);
                const my = $gameMap.canvasToMapY(TouchInput.y);
                const validCell = window.$gameMap && $gameMap.isValid(mx, my);

                if (!overUI && !busy && validCell) {
                    if (TouchInput.isPressed()) {
                        // Real held press -> Claim for map drag
                        pendingGesture = {
                            sx: TouchInput.x,
                            sy: TouchInput.y,
                            mx,
                            my,
                            z: viewZ(),
                            area: W ? W.currentArea() : { x: 0, y: 0 },
                            frame: Graphics.frameCount,
                            shift: (typeof TouchInput._shiftKey !== "undefined" ? TouchInput._shiftKey : false) || Input.isPressed("shift")
                        };
                        gestureState = "pending";

                        // Consume trigger for subsequent readers
                        TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false });
                    } else {
                        // Complete fast click or synthetic click
                        handleCompleteClick(this, mx, my);
                    }
                }
            }

            _updateOverseerControls.call(this);
        };
    }

    function handleCompleteClick(scene, mx, my) {
        const W = World();
        const curZ = viewZ();
        const area = W ? W.currentArea() : { x: 0, y: 0 };
        const cfg = getConfig();
        const isShift = (typeof TouchInput._shiftKey !== "undefined" ? TouchInput._shiftKey : false) || Input.isPressed("shift");

        if (activeTool) {
            // 1x1 tool commit
            const tDef = cfg.tools.find(t => t.id === activeTool);
            if (tDef) {
                queueCommit(tDef, { x0: mx, y0: my, x1: mx, y1: my, z: curZ, area, shift: false, tool: activeTool });
            }
            TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false });
        } else if (isShift) {
            // Shift-click: toggle player unit in selection
            const u = findUnitAt(mx, my, area, curZ);
            if (u && isPlayerUnit(u)) {
                if (selectedGroup.includes(u.id)) {
                    selectedGroup = selectedGroup.filter(id => id !== u.id);
                } else {
                    selectedGroup.push(u.id);
                }
                syncOverseerSelection();
                emit("select:changed", selectedGroup.slice());
                TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false });
            }
        } else if (selectedGroup.length >= 2) {
            const u = findUnitAt(mx, my, area, curZ);
            if (!u || !isPlayerUnit(u)) {
                // Group move to cell!
                groupMove({ area, x: mx, y: my, z: curZ });
                TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false });
            }
        } else if (!isProvoked("plain_click")) {
            const u = findUnitAt(mx, my, area, curZ);
            if (u && isPlayerUnit(u)) {
                setSelection([u.id]);
                SoundManager.playCursor();
                TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false });
            } else if (selectedGroup.length === 1) {
                const uid = selectedGroup[0];
                const selU = W ? W.unit(uid) : null;
                if (selU) {
                    const C = Colonists();
                    const J = Jobs();
                    let ordered = null;
                    if (C && typeof C.order === "function" && C.isColonist(selU)) {
                        ordered = C.order(uid, { type: "move", target: { area, x: mx, y: my, z: curZ } });
                    }
                    if (!ordered && J && typeof J.create === "function") {
                        ordered = J.create({ type: "move", target: { area, x: mx, y: my, z: curZ }, owner: uid, params: { ordered: true } });
                    }
                    if (ordered) {
                        setTargetedTile(mx, my);
                        SoundManager.playOk();
                        TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false });
                    }
                }
            }
        }
    }

    //-------------------------------------------------------------------------
    // Public API (UF.Select)
    //-------------------------------------------------------------------------

    const SelectAPI = {
        viewZ,
        isPlayerUnit,
        pointerOverUI,
        selected: () => selectedGroup.slice(),
        primary: primaryUnit,
        setSelection,
        clearSelection,
        tool: () => activeTool,
        setTool,
        tools: () => getConfig().tools.slice(),
        box: () => (activeBox ? Object.assign({}, activeBox) : null),
        groupMove,
        commits: () => commitQueue.slice(),
        zones: () => {
            const st = ensureSelectState();
            return st && st.zones ? st.zones.slice() : [];
        },
        zoneAt: (x, y, z) => {
            const st = ensureSelectState();
            if (!st || !st.zones) return null;
            const checkZ = typeof z === "number" ? z : viewZ();
            return st.zones.find(zone => (zone.z || 0) === checkZ && zoneHasCell(zone, x, y)) || null;
        },
        lastSummary: () => (lastSummaryData ? Object.assign({}, lastSummaryData) : null),
        stats: () => Object.assign({}, perfStats),
        statusText: () => statusText,
        registeredKeys: () => Object.assign({}, registeredKeys),
        targetedTile,
        setTargetedTile,
        clearTargetedTile
    };

    window.UF = window.UF || {};
    window.UF.Select = SelectAPI;
    window.UF.Target = {
        setTargetedTile,
        clearTargetedTile,
        targetedTile
    };

    //-------------------------------------------------------------------------
    // Test Suite: "select"
    //-------------------------------------------------------------------------

    function registerSelectChecks() {
        if (!window.UF || !UF.Test || typeof UF.Test.suite !== "function") return;
        UF.Test.suite("select", async t => {
            const W = World(), O = Objects(), I = Items(), J = Jobs(), C = Colonists();
            const area = W ? W.currentArea() : null;
            if (!W || !O || !I || !J || !area) {
                t.check("select_ready", false, "Required engine systems not available");
                return;
            }

            const initialErrors = t.errorsSoFar().length;

            // Input dispatch helpers
            function canvasToClient(cx, cy) {
                const canvas = Graphics._canvas;
                const left = canvas ? canvas.offsetLeft : 0;
                const top = canvas ? canvas.offsetTop : 0;
                const scale = Graphics._realScale || 1;
                return {
                    clientX: Math.round(cx * scale + left),
                    clientY: Math.round(cy * scale + top)
                };
            }

            function mapToCanvas(mx, my) {
                const z = window.UF.Camera ? UF.Camera.zoom() : 1;
                const tileSize = 48 * z;
                return {
                    x: Math.round(($gameMap.adjustX(mx) + 0.35) * tileSize),
                    y: Math.round(($gameMap.adjustY(my) + 0.35) * tileSize)
                };
            }

            async function pressKey(keyCode) {
                document.dispatchEvent(new KeyboardEvent("keydown", { keyCode, bubbles: true }));
                await t.waitFrames(1);
                document.dispatchEvent(new KeyboardEvent("keyup", { keyCode, bubbles: true }));
                await t.waitFrames(1);
            }

            async function mouseDrag(fromMx, fromMy, toMx, toMy, options = {}) {
                const p0 = mapToCanvas(fromMx, fromMy);
                const p1 = mapToCanvas(toMx, toMy);
                const c0 = canvasToClient(p0.x, p0.y);
                const c1 = canvasToClient(p1.x, p1.y);

                const shiftKey = !!options.shift;
                if (shiftKey) {
                    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 16, bubbles: true }));
                    await t.waitFrames(1);
                }

                // Mouse down
                document.dispatchEvent(new MouseEvent("mousedown", {
                    button: 0,
                    clientX: c0.clientX,
                    clientY: c0.clientY,
                    shiftKey,
                    bubbles: true,
                    cancelable: true
                }));
                await t.waitFrames(1);

                // Moves across threshold
                const steps = 4;
                for (let i = 1; i <= steps; i++) {
                    const cx = c0.clientX + Math.round((c1.clientX - c0.clientX) * (i / steps));
                    const cy = c0.clientY + Math.round((c1.clientY - c0.clientY) * (i / steps));
                    document.dispatchEvent(new MouseEvent("mousemove", {
                        button: 0,
                        clientX: cx,
                        clientY: cy,
                        shiftKey,
                        bubbles: true,
                        cancelable: true
                    }));
                    await t.waitFrames(1);
                }

                // Mouse up
                document.dispatchEvent(new MouseEvent("mouseup", {
                    button: 0,
                    clientX: c1.clientX,
                    clientY: c1.clientY,
                    shiftKey,
                    bubbles: true,
                    cancelable: true
                }));
                await t.waitFrames(1);
                if (shiftKey) {
                    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 16, bubbles: true }));
                    await t.waitFrames(1);
                }
                await t.waitFrames(2);
            }

            async function mouseClick(mx, my, options = {}) {
                const p = mapToCanvas(mx, my);
                const c = canvasToClient(p.x, p.y);
                window._debugMouseClick = { mx, my, p, c, dispX: $gameMap._displayX, dispY: $gameMap._displayY };
                const shiftKey = !!options.shift;
                const button = typeof options.button === "number" ? options.button : 0;

                if (shiftKey) {
                    document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 16, bubbles: true }));
                    await t.waitFrames(1);
                }
                document.dispatchEvent(new MouseEvent("mousedown", {
                    button,
                    clientX: c.clientX,
                    clientY: c.clientY,
                    shiftKey,
                    bubbles: true,
                    cancelable: true
                }));
                await t.waitFrames(options.slow ? 5 : 1);
                document.dispatchEvent(new MouseEvent("mouseup", {
                    button,
                    clientX: c.clientX,
                    clientY: c.clientY,
                    shiftKey,
                    bubbles: true,
                    cancelable: true
                }));
                await t.waitFrames(1);
                if (shiftKey) {
                    document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: 16, bubbles: true }));
                    await t.waitFrames(1);
                }
                await t.waitFrames(2);
            }

            function clearAllJobs() {
                if (J && J.list) {
                    const list = J.list().slice();
                    for (const j of list) {
                        J.cancel(j.id, "cleanup");
                    }
                }
                if (W && W.stopUnit && W.units) {
                    for (const u of W.units()) {
                        W.stopUnit(u.id);
                    }
                }
            }

            // Search for unpopulated clear arena like UF_Sheet
            const mid = Math.floor(W.state.size / 2);
            const water = (x, y) => (typeof J.isWaterAt === "function" ? J.isWaterAt(area, x, y) : Tilemap.isWaterTile($gameMap.tileId(x, y, 0)));
            const cellOk = (x, y) => $gameMap.isValid(x, y) && !water(x, y) && $gameMap.regionId(x, y) !== 250 && $gameMap.checkPassage(x, y, 0x0f)
                && $gameMap.eventsXy(x, y).length === 0 && I.at(x, y).length === 0;
            const candidates = [[14, 14], [20, 20], [-24, 20], [24, -20], [-24, -24], [30, 10]];
            let arena = null, best = null;
            for (const [dx, dy] of candidates) {
                const ax0 = mid + dx, ay0 = mid + dy;
                let good = 0;
                for (let y = ay0; y < ay0 + 12; y++) for (let x = ax0; x < ax0 + 12; x++) if (cellOk(x, y)) good++;
                if (!best || good > best.good) best = { x0: ax0, y0: ay0, good };
                if (good === 144) { arena = best; break; }
            }
            if (!arena) arena = best;
            const { x0, y0 } = arena;

            const cleanArena = () => {
                for (let y = y0; y < y0 + 12; y++) {
                    for (let x = x0; x < x0 + 12; x++) {
                        O.set(x, y, null);
                    }
                }
            };
            cleanArena();
            clearAllJobs();
            clearSelection();
            setTool(null);

            const origPlayerUpdateScroll = $gamePlayer.updateScroll;
            $gamePlayer.updateScroll = function() {};
            const colonistsWere = C && typeof C.setEnabled === "function" ? C.enabled !== false : null;
            if (C && C.setEnabled) C.setEnabled(false);
            $gamePlayer.locate(x0 + 8, y0 + 8);
            $gameMap.setDisplayPos(x0 - 1, y0 - 1);
            await t.waitFrames(2);

            // Spawn test units in arena
            const col1 = W.addUnit({ name: "TEST_Ada", image: { characterName: "$UF_Human_Female" }, area, x: x0 + 1, y: y0 + 1, exact: true, data: { kind: "colonist", faction: "player" } });
            const col2 = W.addUnit({ name: "TEST_Bob", image: { characterName: "$UF_Human_Male" }, area, x: x0 + 3, y: y0 + 1, exact: true, data: { kind: "colonist", faction: "player" } });
            const flier = W.addUnit({ name: "TEST_Crow", image: { characterName: "$U7_Hawk" }, area, x: x0 + 2, y: y0 + 3, exact: true, data: { kind: "pet", faction: "player", flies: true } });
            const allied = W.addUnit({ name: "TEST_AlliedGuard", image: { characterName: "$U7_Guard" }, area, x: x0 + 4, y: y0 + 3, exact: true, data: { kind: "person", faction: "allied_dwarves" } });
            const wild = W.addUnit({ name: "TEST_WildWolf", image: { characterName: "$UF_Wolf" }, area, x: x0 + 1, y: y0 + 4, exact: true, data: { kind: "creature", species: "wolf", faction: null } });
            const outside = W.addUnit({ name: "TEST_Outside", image: { characterName: "$UF_Human_Male" }, area, x: x0 + 9, y: y0 + 9, exact: true, data: { kind: "colonist", faction: "player" } });

            await t.waitFrames(2);

            // 1. Check: select.box_units
            clearSelection();
            setTool(null);
            await mouseDrag(x0, y0, x0 + 5, y0 + 5);
            const sel1 = SelectAPI.selected();
            const hasAda = sel1.includes(col1.id);
            const hasBob = sel1.includes(col2.id);
            const hasFlier = sel1.includes(flier.id);
            const hasAllied = sel1.includes(allied.id);
            const hasWild = sel1.includes(wild.id);
            const hasOutside = sel1.includes(outside.id);

            t.screenshot("select.box_drag");
            t.check("select.box_units", !isProvoked("box_units") && hasAda && hasBob && hasFlier && !hasAllied && !hasWild && !hasOutside && sel1.length === 3,
                `Selected ${sel1.length} units (want col1, col2, flier): ada=${hasAda}, bob=${hasBob}, flier=${hasFlier}, allied=${hasAllied}, wild=${hasWild}, outside=${hasOutside}`);

            // 2. Check: select.shift_adds
            clearSelection();
            clearAllJobs();
            setTool(null);
            if (W && W.stopUnit) {
                W.stopUnit(col1.id);
                W.stopUnit(col2.id);
            }
            col1.x = x0 + 1; col1.y = y0 + 1;
            col2.x = x0 + 3; col2.y = y0 + 1;
            const ev1 = W.eventOf ? W.eventOf(col1.id) : null;
            if (ev1) ev1.locate(col1.x, col1.y);
            const ev2 = W.eventOf ? W.eventOf(col2.id) : null;
            if (ev2) ev2.locate(col2.x, col2.y);
            await t.waitFrames(1);

            // Drag Box A (col1 only)
            await mouseDrag(x0, y0, x0 + 2, y0 + 2);
            const selA = SelectAPI.selected().slice();
            const countA = selA.length;
            const boxA = Object.assign({}, window._lastCommittedBox);
            // Shift + Drag Box B (col2 only)
            await mouseDrag(x0 + 2, y0, x0 + 4, y0 + 2, { shift: true });
            const countAB = SelectAPI.selected().length;
            // Box B without shift
            await mouseDrag(x0 + 2, y0, x0 + 4, y0 + 2, { shift: false });
            const countB = SelectAPI.selected().length;
            // Re-anchor col1 right before the shift-click
            const u1 = W.unit(col1.id);
            if (u1) {
                u1.x = x0 + 1;
                u1.y = y0 + 1;
                u1.goal = null;
            }
            if (ev1) ev1.locate(x0 + 1, y0 + 1);
            if (W && W.stopUnit) W.stopUnit(col1.id);
            await t.waitFrames(1);

            // Shift click col1
            await mouseClick(col1.x, col1.y, { shift: true });
            const countToggle = SelectAPI.selected().length;
            t.check("select.shift_adds", !isProvoked("shift_adds") && countA === 1 && countAB === 2 && countB === 1 && countToggle === 2,
                `Shift behavior: A=${countA}, A+B=${countAB}, plain B=${countB}, toggle=${countToggle}; selNow=${JSON.stringify(SelectAPI.selected())}`);

            // 3. Check: select.plain_click
            clearSelection();
            clearAllJobs();
            setTool(null);
            // Slow click on col1
            await mouseClick(col1.x, col1.y, { slow: true });
            await t.waitFrames(3);
            const slowSel = SelectAPI.selected();
            // Click ground to move
            await mouseClick(x0 + 7, y0 + 7);
            await t.waitFrames(3);
            const jobsList = J.list();
            const moveJob = jobsList.find(j => j.owner === col1.id && j.type === "move" && j.target && j.target.x === x0 + 7 && j.target.y === y0 + 7);

            t.check("select.plain_click", !isProvoked("plain_click") && slowSel.length === 1 && slowSel[0] === col1.id && !!moveJob,
                `Plain click: slow select=${slowSel.length === 1 && slowSel[0] === col1.id}, ground move job=${!!moveJob}`);

            // 4. Check: select.group_move
            clearSelection();
            clearAllJobs();
            setTool(null);
            const col5 = W.addUnit({ name: "TEST_Fifth", image: { characterName: "$UF_Human_Female" }, area, x: x0 + 5, y: y0 + 1, exact: true, data: { kind: "colonist", faction: "player" } });
            setSelection([col1.id, col2.id, flier.id, outside.id, col5.id]);

            // Target cell T with obstacle neighbours (in open meadow clear of colonist card)
            const tx = x0 + 10, ty = y0 + 3; // inside arena, clear of colonist card
            O.set(tx + 1, ty, "granite_boulder");
            await mouseClick(tx, ty);
            await t.waitFrames(3);

            const activeMoveJobs = J.list().filter(j => [col1.id, col2.id, flier.id, outside.id, col5.id].includes(j.owner) && j.type === "move" && j.state !== "failed");
            const targetCells = activeMoveJobs.map(j => `${j.target.x},${j.target.y}`);
            const distinctTargets = new Set(targetCells);

            t.screenshot("select.group_moved");
            t.check("select.group_move", !isProvoked("group_move") && activeMoveJobs.length === 5 && distinctTargets.size === 5,
                `Group move: jobs=${activeMoveJobs.length} (want 5), distinct targets=${distinctTargets.size} (want 5); targets: ${targetCells.join(" | ")}`);

            // 5. Check: select.tool_chop_area
            cleanArena();
            clearAllJobs();
            clearSelection();
            setTool(null);
            // Plant 4 oaks in rows 6 and 7 where no units stand
            O.set(x0 + 1, y0 + 6, "oak");
            O.set(x0 + 3, y0 + 6, "oak");
            O.set(x0 + 1, y0 + 7, "oak");
            O.set(x0 + 3, y0 + 7, "oak");

            await pressKey(67); // Key 'C' (Chop)
            await mouseDrag(x0, y0 + 5, x0 + 5, y0 + 8);
            await t.waitUntil(() => SelectAPI.commits().length === 0, 3000);
            await t.waitFrames(3);

            const chopJobs = J.list().filter(j => j.type === "chop" && j.owner === null && (j.state === "open" || j.state === "travel" || j.state === "work"));
            const summary = SelectAPI.lastSummary();

            t.screenshot("select.chop_marked");
            t.check("select.tool_chop_area", !isProvoked("tool_chop_area") && chopJobs.length >= 4 && summary && summary.made === 4,
                `Chop area: active chop designations=${chopJobs.length} (want >=4), commit summary made=${summary ? summary.made : "none"}`);

            // 6. Check: select.tool_skips_ineligible
            cleanArena();
            clearAllJobs();
            clearSelection();
            setTool("chop");
            O.set(x0 + 1, y0 + 6, "oak"); // Will be already designated
            J.create({ type: "chop", target: { area, x: x0 + 1, y: y0 + 6, z: viewZ() }, owner: null });
            O.set(x0 + 2, y0 + 6, "oak"); // Eligible oak

            // Add test gate wrapper on UF.Interact.optionsFor
            const origOptionsFor = Interact().optionsFor;
            Interact().optionsFor = function(x, y) {
                const opts = origOptionsFor.call(this, x, y);
                if (x === x0 + 3 && y === y0 + 6) {
                    for (const o of opts) {
                        if (o.id === "action:chop") {
                            o.enabled = false;
                            o.reason = "TEST_gate";
                        }
                    }
                }
                return opts;
            };
            O.set(x0 + 3, y0 + 6, "oak"); // Gated oak

            await mouseDrag(x0, y0 + 5, x0 + 4, y0 + 7);
            await t.waitUntil(() => SelectAPI.commits().length === 0, 3000);
            await t.waitFrames(3);
            Interact().optionsFor = origOptionsFor;

            const ineligSummary = SelectAPI.lastSummary();
            const hadAlreadyMarked = ineligSummary && ineligSummary.skipped && ineligSummary.skipped["already marked"] >= 1;
            const hadGate = ineligSummary && ineligSummary.skipped && ineligSummary.skipped["TEST_gate"] >= 1;

            t.check("select.tool_skips_ineligible", !isProvoked("tool_skips_ineligible") && hadAlreadyMarked && hadGate,
                `Skips ineligible: already_marked=${hadAlreadyMarked}, gate_skipped=${hadGate}; summary: ${JSON.stringify(ineligSummary ? ineligSummary.skipped : {})}`);

            // 7. Check: select.tool_obeys_unlocks
            cleanArena();
            clearAllJobs();
            clearSelection();
            window.UF.Tech = window.UF.Tech || {};
            const origCanBuild = window.UF.Tech.canBuild;
            window.UF.Tech.canBuild = function(id) {
                if (id === "wall_wood") return { ok: false, reason: "Locked (TEST_tech)" };
                return { ok: true };
            };

            setTool("wall", { wall: "wall_wood" });
            await mouseDrag(x0 + 1, y0 + 6, x0 + 3, y0 + 6);
            await t.waitUntil(() => SelectAPI.commits().length === 0, 3000);
            await t.waitFrames(3);

            window.UF.Tech.canBuild = origCanBuild;
            const lockSummary = SelectAPI.lastSummary();
            const lockJobs = J.list().filter(j => j.type === "build" && j.params && j.params.objectId === "wall_wood" && j.target.y === y0 + 6 && j.state !== "failed");

            t.check("select.tool_obeys_unlocks", !isProvoked("tool_obeys_unlocks") && lockJobs.length === 0 && lockSummary && lockSummary.skipped && lockSummary.skipped["Locked (TEST_tech)"] >= 1,
                `Obeys unlocks: build jobs made=${lockJobs.length} (want 0), skipped with lock reason=${lockSummary && lockSummary.skipped ? lockSummary.skipped["Locked (TEST_tech)"] : "none"}`);

            // 8. Check: select.zone_saved
            cleanArena();
            clearAllJobs();
            clearSelection();
            setTool("stockpile");
            await mouseDrag(x0 + 1, y0 + 6, x0 + 4, y0 + 8);
            await t.waitUntil(() => SelectAPI.commits().length === 0, 3000);
            await t.waitFrames(3);

            const zones = SelectAPI.zones();
            const zoneCreated = zones.length > 0;
            let zoneRoundTrip = false;
            if (zoneCreated) {
                const dumped = JsonEx.stringify(W.state.select);
                const loaded = JsonEx.parse(dumped);
                zoneRoundTrip = loaded && loaded.zones && loaded.zones.length === zones.length && loaded.zones[0].name === zones[0].name;
            }

            t.screenshot("select.stockpile_zone");
            t.check("select.zone_saved", !isProvoked("zone_saved") && zoneCreated && zoneRoundTrip,
                `Zone saved: zone created=${zoneCreated}, JsonEx round trip intact=${zoneRoundTrip}`);

            // 9. Check: select.cancel_area
            cleanArena();
            clearAllJobs();
            clearSelection();
            setTool(null);
            // Create chop job inside and outside
            J.create({ type: "chop", target: { area, x: x0 + 2, y: y0 + 6, z: viewZ() }, owner: null });
            J.create({ type: "chop", target: { area, x: x0 + 8, y: y0 + 8, z: viewZ() }, owner: null });
            const ownedJob = J.create({ type: "move", target: { area, x: x0 + 2, y: y0 + 6, z: viewZ() }, owner: col1.id });

            await pressKey(78); // Key 'N' (Cancel)
            await mouseDrag(x0 + 1, y0 + 5, x0 + 4, y0 + 7);
            await t.waitFrames(10);

            const insideChop = J.list().find(j => j.type === "chop" && j.target.x === x0 + 2 && j.target.y === y0 + 6);
            const outsideChop = J.list().find(j => j.type === "chop" && j.target.x === x0 + 8 && j.target.y === y0 + 8);
            const ownedAlive = J.list().find(j => j.id === ownedJob.id && j.state !== "failed");

            t.check("select.cancel_area", !isProvoked("cancel_area") && (!insideChop || insideChop.state === "failed") && outsideChop && outsideChop.state !== "failed" && !!ownedAlive,
                `Cancel area: inside cancelled=${!insideChop || insideChop.state === "failed"}, outside preserved=${outsideChop && outsideChop.state !== "failed"}, owned preserved=${!!ownedAlive}`);

            // 10. Check: select.no_clickthrough
            setTool(null);
            clearSelection();
            const tb = SceneManager._scene._ufSelectToolbar;
            if (tb) {
                // Drag starting from toolbar
                const clientTb = canvasToClient(tb.x + 10, tb.y + 10);
                const clientMap = canvasToClient(x0 + 2, y0 + 2);
                document.dispatchEvent(new MouseEvent("mousedown", { button: 0, clientX: clientTb.clientX, clientY: clientTb.clientY, bubbles: true }));
                await t.waitFrames(1);
                document.dispatchEvent(new MouseEvent("mousemove", { button: 0, clientX: clientMap.clientX, clientY: clientMap.clientY, bubbles: true }));
                await t.waitFrames(1);
                document.dispatchEvent(new MouseEvent("mouseup", { button: 0, clientX: clientMap.clientX, clientY: clientMap.clientY, bubbles: true }));
                await t.waitFrames(2);
            }
            const selAfterUI = SelectAPI.selected();
            t.check("select.no_clickthrough", !isProvoked("no_clickthrough") && selAfterUI.length === 0,
                `No clickthrough on UI drag: selection length=${selAfterUI.length} (want 0)`);

            // 11. Check: select.leave_tool
            setTool("chop");
            // Right-click on map to leave tool
            await mouseClick(x0 + 2, y0 + 2, { button: 2 });
            const toolAfterRight = SelectAPI.tool();
            const menuOpenAfter = Interact().isOpen();

            t.check("select.leave_tool", !isProvoked("leave_tool") && toolAfterRight === null && !menuOpenAfter,
                `Leave tool on right-click: tool=${toolAfterRight} (want null), menu open=${menuOpenAfter} (want false)`);

            // 12. Check: select.level_scope
            const z0 = SelectAPI.viewZ();
            let levelCancelled = false;
            setTool("chop");
            const p0 = mapToCanvas(x0 + 1, y0 + 6);
            const p1 = mapToCanvas(x0 + 3, y0 + 8);
            const c0 = canvasToClient(p0.x, p0.y);
            const c1 = canvasToClient(p1.x, p1.y);

            document.dispatchEvent(new MouseEvent("mousedown", { button: 0, clientX: c0.clientX, clientY: c0.clientY, bubbles: true }));
            await t.waitFrames(1);
            document.dispatchEvent(new MouseEvent("mousemove", { button: 0, clientX: c1.clientX, clientY: c1.clientY, bubbles: true }));
            await t.waitFrames(1);

            // Change level mid-drag
            if (window.UF && UF.Levels && typeof UF.Levels.setViewZ === "function") {
                UF.Levels.setViewZ(1);
            } else if (W && W.state) {
                W.state.view = W.state.view || {};
                W.state.view.z = 1;
            }
            await t.waitFrames(1);
            levelCancelled = SelectAPI.box() === null;

            // Restore z
            if (window.UF && UF.Levels && typeof UF.Levels.setViewZ === "function") {
                UF.Levels.setViewZ(z0);
            } else if (W && W.state && W.state.view) {
                W.state.view.z = z0;
            }
            document.dispatchEvent(new MouseEvent("mouseup", { button: 0, clientX: c1.clientX, clientY: c1.clientY, bubbles: true }));
            await t.waitFrames(2);

            t.check("select.level_scope", !isProvoked("level_scope") && levelCancelled,
                `Level scope: drag cancelled when view level changed = ${levelCancelled}`);

            // 13. Check: select.keys_free
            const regKeys = SelectAPI.registeredKeys();
            let collisions = 0;
            for (const [code, info] of Object.entries(regKeys)) {
                if (info.collided) collisions++;
            }
            t.check("select.keys_free", !isProvoked("keys_free") && collisions === 0,
                `Keys free check: collisions=${collisions}; details: ${JSON.stringify(regKeys)}`);

            // 14. Check: select.big_rect_frame_time
            cleanArena();
            clearAllJobs();
            setTool("chop");
            perfStats.worstFrameMs = 0;
            // Drag over a large 30x30 area
            await mouseDrag(x0, y0, x0 + 29, y0 + 29);
            // Process commits across frames
            let waitFramesCount = 0;
            while (SelectAPI.commits().length > 0 && waitFramesCount < 60) {
                await t.waitFrames(1);
                waitFramesCount++;
            }
            const worstMs = perfStats.worstFrameMs;

            t.screenshot("select.big_box");
            t.check("select.big_rect_frame_time", !isProvoked("big_rect_frame_time") && worstMs <= 25,
                `Big rectangle frame time: worst frame=${worstMs.toFixed(2)} ms (budget <= 25 ms in test harness)`);

            // 15. Check: select.tile_hover_selector
            cleanArena();
            clearAllJobs();
            clearSelection();
            setTool(null);
            const hx = x0 + 4, hy = y0 + 4;
            const hp = mapToCanvas(hx, hy);
            TouchInput._x = hp.x;
            TouchInput._y = hp.y;
            await t.waitFrames(3);

            const overlay = SceneManager._scene && SceneManager._scene._spriteset ? SceneManager._scene._spriteset._ufSelectOverlay : null;
            const ob = overlay && overlay.bitmap;
            let hoverAlpha = 0;
            if (ob) {
                hoverAlpha = ob.getAlphaPixel(hp.x, hp.y);
            }
            t.screenshot("select.tile_hover_selector");
            t.check("select.tile_hover_selector", !isProvoked("tile_hover_selector") && hoverAlpha > 30 && hoverAlpha < 100,
                `Hover tile selector: alpha at (${hp.x},${hp.y})=${hoverAlpha} (want translucent ~56 alpha, range 30-100)`);

            // 16. Check: select.target_square_brackets
            const tgtX = x0 + 6, tgtY = y0 + 4;
            SelectAPI.setTargetedTile(tgtX, tgtY);
            await t.waitFrames(3);

            const tp = mapToCanvas(tgtX, tgtY);
            const z = window.UF.Camera ? UF.Camera.zoom() : 1;
            const tileSize = 48 * z;
            const tsx = Math.round($gameMap.adjustX(tgtX) * tileSize);
            const tsy = Math.round($gameMap.adjustY(tgtY) * tileSize);

            let bracketWhiteFound = false;
            let bracketShadowFound = false;
            if (ob) {
                const pColor = ob.getPixel(tsx + 2, tsy + 1);
                bracketWhiteFound = pColor === "#ffffff";
                bracketShadowFound = ob.getAlphaPixel(tsx - 1, tsy - 1) > 100;
            }
            t.screenshot("select.target_square_brackets");

            // Also hover over targeted tile to demonstrate both simultaneously
            TouchInput._x = tp.x;
            TouchInput._y = tp.y;
            await t.waitFrames(3);
            t.screenshot("select.hover_and_target_brackets");

            SelectAPI.clearTargetedTile();
            await t.waitFrames(2);
            const targetedAfterClear = SelectAPI.targetedTile();

            t.check("select.target_square_brackets", !isProvoked("target_square_brackets") && bracketWhiteFound && bracketShadowFound && targetedAfterClear === null,
                `Target square brackets: white corner found=${bracketWhiteFound}, shadow found=${bracketShadowFound}, clearTargetedTile works=${targetedAfterClear === null}`);

            // 17. Check: select.no_errors
            const finalErrors = t.errorsSoFar().length;
            t.check("select.no_errors", !isProvoked("no_errors") && finalErrors === initialErrors,
                `Errors during suite: gained ${finalErrors - initialErrors} errors`);

            // Cleanup
            $gamePlayer.updateScroll = origPlayerUpdateScroll;
            if (C && C.setEnabled && colonistsWere !== null) C.setEnabled(colonistsWere);
            cleanArena();
            clearAllJobs();
            clearSelection();
            setTool(null);
            cancelBox("suite finished");
        }, { isDefault: false });
    }

    registerSelectChecks();

})();
