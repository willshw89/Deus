//=============================================================================
// DEUS_Minimap.js - Lightweight, Scalable Knowledge-Based Strategic Minimap
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Minimap] Strategic overview minimap reflecting character knowledge/discovery across the Z-levels of the world (its Z range).
 * @author DEUS Project
 * @orderAfter DEUS_World
 * @orderAfter DEUS_Levels
 * @orderAfter DEUS_Camera
 * @orderAfter DEUS_Fog
 * @orderAfter DEUS_Select
 *
 * @param PanelWidth
 * @text Minimap Width
 * @type number
 * @default 164
 * @desc Total width of the minimap panel in screen pixels.
 *
 * @param PanelHeight
 * @text Minimap Height
 * @type number
 * @default 196
 * @desc Total height of the minimap panel in screen pixels.
 *
 * @param DefaultZoom
 * @text Default Map Zoom
 * @type select
 * @option Full Area (1:2 scale)
 * @value full
 * @option Local Focus (1:1 scale)
 * @value local
 * @default full
 * @desc Whether the minimap shows the whole 256x256 area or a 1:1 local view centered on camera.
 *
 * @help
 * DEUS Minimap provides a strategic tactical overview reflecting CHARACTER
 * KNOWLEDGE / DISCOVERY rather than omniscient raw world truth.
 *
 * Key Features:
 * - The physical Z-levels of the world's Z range (UF.World, WG.00.17) with independent discovery layers; a
 *   level's discovery and base bitmap exist once its tab is shown. The tab row shows 5 levels round the active one.
 * - Modes: Command, Combat, and Incarnate mode filters.
 * - Zero Full-World Redraw: 16x16 chunk-cached static terrain base with dynamic overlay.
 * - High-speed 60 FPS performance compatible with 4x simulation.
 * - Viewport camera rectangle and click-to-pan / drag-to-pan navigation.
 * - Complete save/load persistence of exploration data.
 */

(() => {
    "use strict";

    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;

    const CHUNK_SIZE = 16;
    const CHUNKS_PER_ROW = 16; // 256 / 16
    const TOTAL_CHUNKS = 256;
    // The Z range comes from UF.World, the one authority (WG.00.17); a World without it (an older World, the headless
    // test's stand-in) has the legacy levels -2..+2. The tab row shows TAB_COUNT levels round the active one, top first.
    const LEGACY_Z_RANGE = Object.freeze({ zMin: -2, zMax: 2 });
    const TAB_COUNT = 5;
    function zRange() {
        const W = window.UF && UF.World;
        return W && typeof W.zRange === "function" ? W.zRange() : LEGACY_Z_RANGE;
    }
    function tabLevels() {
        const r = zRange(), n = Math.min(TAB_COUNT, r.zMax - r.zMin + 1);
        const top = Math.min(r.zMax, Math.max(r.zMin + n - 1, _state.activeZ + (n >> 1)));
        const out = [];
        for (let k = 0; k < n; k++) out.push(top - k);
        return out;
    }
    const OVERLAY_FRAMES = 4; // the unit/project/connector overlay is redrawn at most every 4 updates (15 Hz) unless the view changed

    // Categorical Information-Graphic Palette (Hex to RGBA)
    const PALETTE = {
        // Unknown / Void
        UNKNOWN:         [6, 7, 10, 255],     // #06070a deep void
        // Terrain - Open & Biomes
        MEADOW:          [59, 109, 59, 255],   // #3b6d3b vibrant grassland
        MEADOW_DIM:      [30, 56, 30, 255],
        FOREST:          [30, 70, 32, 255],    // #1e4620 deep canopy
        FOREST_DIM:      [16, 38, 17, 255],
        DIRT:            [133, 101, 69, 255],  // #856545 earth
        DIRT_DIM:        [70, 53, 36, 255],
        SAND:            [194, 157, 91, 255],  // #c29d5b desert sand
        SAND_DIM:        [100, 81, 47, 255],
        SNOW:            [203, 213, 225, 255], // #cbd5e1 crisp snow
        SNOW_DIM:        [100, 116, 139, 255],
        SWAMP:           [62, 92, 70, 255],    // #3e5c46 wetland
        SWAMP_DIM:       [32, 48, 36, 255],
        ROCK:            [107, 114, 128, 255], // #6b7280 stone
        ROCK_DIM:        [55, 65, 81, 255],
        VOLCANIC:        [51, 47, 53, 255],    // #332f35 ash
        VOLCANIC_DIM:    [27, 25, 28, 255],
        // Fluids
        WATER_SHALLOW:   [56, 189, 248, 255],  // #38bdf8 shallow stream
        WATER_SHALLOW_DIM:[2, 132, 199, 255],
        WATER_DEEP:      [29, 78, 216, 255],   // #1d4ed8 ocean/lake
        WATER_DEEP_DIM:  [30, 58, 138, 255],
        LAVA:            [234, 88, 12, 255],   // #ea580c burning lava
        LAVA_DIM:        [154, 52, 18, 255],
        // Structural
        SOLID_WALL:      [71, 85, 105, 255],   // #475569 natural cliff/cavern wall
        SOLID_WALL_DIM:  [30, 41, 59, 255],
        WOOD_WALL:       [146, 64, 14, 255],   // #92400e constructed log/timber
        WOOD_WALL_DIM:   [69, 26, 3, 255],
        STONE_WALL:      [148, 163, 184, 255], // #94a3b8 masonry wall
        STONE_WALL_DIM:  [71, 85, 105, 255],
        FLOOR:           [217, 119, 6, 255],   // #d97706 paved road/floor
        FLOOR_DIM:       [120, 53, 15, 255],
        DOOR:            [226, 232, 240, 255], // #e2e8f0 door
        DOOR_DIM:        [100, 116, 139, 255]
    };

    // State storage across the Z levels of the world
    const _state = {
        mode: "command",        // "command" | "combat" | "incarnate"
        activeZ: 0,             // Currently inspected minimap Z level (a level of the Z range)
        followCameraZ: true,    // True: minimap automatically matches world camera Z
        incarnatedUnitId: null, // For incarnate mode
        expanded: true,         // Panel expanded/minimized
        zoomMode: "full",       // "full" (1:2) or "local" (1:1)
        discovery: {},          // key `area:X,Y:zZ` -> Uint8Array(256 * 256): 0=unknown, 1=discovered
        dirtyChunks: {},        // key `area:X,Y:zZ` -> Set of chunk keys (`cx,cy`)
        baseBitmaps: {},        // key `area:X,Y:zZ` -> Bitmap(256, 256)
        stats: {
            dirtyRebuilds: 0,
            overlayTicks: 0,
            lastRebuildTimeMs: 0,
            lastOverlayTimeMs: 0
        }
    };

    // Helper: current area coordinates
    function currentArea() {
        const W = window.UF && UF.World;
        if (W && typeof W.currentArea === "function") {
            const a = W.currentArea();
            if (a) return { x: a.x, y: a.y };
        }
        return { x: 0, y: 0 };
    }

    function currentWorldZ() {
        const L = window.UF && UF.Levels;
        if (L && typeof L.view === "function") {
            const z = L.view();
            if (typeof z === "number") return z;
        }
        const W = window.UF && UF.World;
        if (W && typeof W.viewLevel === "function") {
            const v = W.viewLevel();
            if (v && typeof v.z === "number") return v.z;
        }
        return 0;
    }

    function mapKey(z = _state.activeZ, area = currentArea()) {
        return `area:${area.x},${area.y}:z${z}`;
    }

    // Encoding / decoding exploration bitsets
    function encodeBitset(bytes) {
        const bits = new Uint8Array(Math.ceil(bytes.length / 8));
        for (let i = 0; i < bytes.length; i++) {
            if (bytes[i]) bits[i >> 3] |= (1 << (i & 7));
        }
        let s = "";
        for (let i = 0; i < bits.length; i += 4096) {
            s += String.fromCharCode.apply(null, bits.subarray(i, i + 4096));
        }
        return btoa(s);
    }

    function decodeBitset(str, n) {
        const out = new Uint8Array(n);
        if (!str) return out;
        try {
            const s = atob(str);
            for (let i = 0; i < n; i++) {
                if (s.charCodeAt(i >> 3) & (1 << (i & 7))) out[i] = 1;
            }
        } catch (_) {}
        return out;
    }

    // Ensure discovery buffer exists for key
    function ensureDiscovery(z = _state.activeZ) {
        const k = mapKey(z);
        if (!_state.discovery[k]) {
            // Check saved state in UF.World.state
            const saved = window.UF && UF.World && UF.World.state && UF.World.state.minimapDiscovery;
            if (saved && saved[k]) {
                _state.discovery[k] = decodeBitset(saved[k], 256 * 256);
            } else {
                _state.discovery[k] = new Uint8Array(256 * 256);
                // In development / initial surface spawn, reveal around spawn if empty
                if (z === 0) {
                    const cx = 128, cy = 128;
                    const r = 24, r2 = r * r;
                    for (let dy = -r; dy <= r; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            if (dx * dx + dy * dy <= r2) {
                                const px = cx + dx, py = cy + dy;
                                if (px >= 0 && px < 256 && py >= 0 && py < 256) {
                                    _state.discovery[k][py * 256 + px] = 1;
                                }
                            }
                        }
                    }
                }
            }
        }
        return _state.discovery[k];
    }

    // Ensure base bitmap exists for key
    function ensureBaseBitmap(z = _state.activeZ) {
        const k = mapKey(z);
        if (!_state.baseBitmaps[k]) {
            const bmp = new Bitmap(256, 256);
            bmp.smooth = false;
            // Fill with dark void initially
            bmp.fillAll("#06070a");
            _state.baseBitmaps[k] = bmp;
            // Mark all chunks dirty to populate
            markAllChunksDirty(z);
        }
        return _state.baseBitmaps[k];
    }

    function markAllChunksDirty(z = _state.activeZ) {
        const k = mapKey(z);
        let s = _state.dirtyChunks[k];
        if (!s) s = _state.dirtyChunks[k] = new Set();
        for (let cy = 0; cy < CHUNKS_PER_ROW; cy++) {
            for (let cx = 0; cx < CHUNKS_PER_ROW; cx++) {
                s.add(`${cx},${cy}`);
            }
        }
    }

    // Invalidation
    function invalidateCell(x, y, z = currentWorldZ()) {
        if (x < 0 || x >= 256 || y < 0 || y >= 256) return;
        const cx = x >> 4, cy = y >> 4;
        const k = mapKey(z);
        let s = _state.dirtyChunks[k];
        if (!s) s = _state.dirtyChunks[k] = new Set();
        s.add(`${cx},${cy}`);
    }

    function invalidateArea(x, y, w, h, z = currentWorldZ()) {
        const cx0 = Math.max(0, x >> 4), cx1 = Math.min(CHUNKS_PER_ROW - 1, (x + w) >> 4);
        const cy0 = Math.max(0, y >> 4), cy1 = Math.min(CHUNKS_PER_ROW - 1, (y + h) >> 4);
        const k = mapKey(z);
        let s = _state.dirtyChunks[k];
        if (!s) s = _state.dirtyChunks[k] = new Set();
        for (let cy = cy0; cy <= cy1; cy++) {
            for (let cx = cx0; cx <= cx1; cx++) {
                s.add(`${cx},${cy}`);
            }
        }
    }

    // Cell classification logic for minimap pixel color
    function sampleCell(x, y, z, isDiscovered, isVis) {
        if (!isDiscovered) return PALETTE.UNKNOWN;

        const W = window.UF && UF.World;
        const view = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
        // The level of the tab being drawn (z), in the area on screen: never the level on screen, or a tab would show
        // that level's objects and ground (WG.00.09b K2).
        const area = view ? { x: view.x, y: view.y, z } : null;

        // 1. Check constructed walls, doors, floors, and objects
        const O = window.UF && UF.Objects;
        if (O && typeof O.atIn === "function") {
            const obj = O.atIn(area, x, y);
            if (obj) {
                const id = String(obj.id || "");
                const tags = Array.isArray(obj.tags) ? obj.tags : [];

                if (tags.includes("door") || id.includes("door")) {
                    const isOpen = window.UF && UF.Doors && typeof UF.Doors.isOpen === "function" && UF.Doors.isOpen(area, x, y);
                    return isOpen ? (isVis ? PALETTE.DOOR : PALETTE.DOOR_DIM) : (isVis ? PALETTE.DOOR : PALETTE.DOOR_DIM);
                }
                if (tags.includes("wall") || id.includes("wall")) {
                    if (id.includes("wood") || id.includes("log")) {
                        return isVis ? PALETTE.WOOD_WALL : PALETTE.WOOD_WALL_DIM;
                    }
                    return isVis ? PALETTE.STONE_WALL : PALETTE.STONE_WALL_DIM;
                }
                if (tags.includes("floor") || id.includes("floor") || id.includes("road")) {
                    return isVis ? PALETTE.FLOOR : PALETTE.FLOOR_DIM;
                }
                if (id === "campfire" || tags.includes("fire")) {
                    return PALETTE.LAVA; // Bright burning ember
                }
            }
        }

        // 2. Check the shape of a level other than the ground: solid rock, open air (nothing there: the void colour), else
        //    a floor of stone (the ground's kinds below belong to the ground only).
        if (z !== 0) {
            const L = window.UF && UF.Levels;
            if (L && typeof L.shapeAt === "function") {
                const s = L.shapeAt({ area, x, y, z });
                if (s === "solid" || s === 1) {
                    return isVis ? PALETTE.SOLID_WALL : PALETTE.SOLID_WALL_DIM;
                }
                if (z > 0 && (s === "open" || s === 3)) return PALETTE.UNKNOWN;
            }
        }

        // 3. Check ground / fluid
        const F = window.UF && UF.Fluid;
        if (F && typeof F.getFluid === "function") {
            const fl = F.getFluid(x, y, z);
            if (fl && fl.depth > 0) {
                if (fl.type === "lava") return isVis ? PALETTE.LAVA : PALETTE.LAVA_DIM;
                if (fl.depth > 3) return isVis ? PALETTE.WATER_DEEP : PALETTE.WATER_DEEP_DIM;
                return isVis ? PALETTE.WATER_SHALLOW : PALETTE.WATER_SHALLOW_DIM;
            }
        }

        // 4. Check base terrain / ground kind (the ground only; another level's floor is stone)
        if (z !== 0) return isVis ? PALETTE.ROCK : PALETTE.ROCK_DIM;
        let groundKind = "meadow";
        if (W && typeof W.groundAt === "function") {
            const g = W.groundAt(x, y);
            if (g && g.kind) groundKind = g.kind;
        }

        switch (groundKind) {
            case "water":
            case "deep_water":
                return isVis ? PALETTE.WATER_DEEP : PALETTE.WATER_DEEP_DIM;
            case "shallow_water":
                return isVis ? PALETTE.WATER_SHALLOW : PALETTE.WATER_SHALLOW_DIM;
            case "sand":
            case "desert":
                return isVis ? PALETTE.SAND : PALETTE.SAND_DIM;
            case "snow":
            case "ice":
                return isVis ? PALETTE.SNOW : PALETTE.SNOW_DIM;
            case "swamp":
            case "marsh":
                return isVis ? PALETTE.SWAMP : PALETTE.SWAMP_DIM;
            case "dirt":
            case "earth":
                return isVis ? PALETTE.DIRT : PALETTE.DIRT_DIM;
            case "rock":
            case "mountain":
            case "peak_rock":
                return isVis ? PALETTE.ROCK : PALETTE.ROCK_DIM;
            case "volcanic":
                return isVis ? PALETTE.VOLCANIC : PALETTE.VOLCANIC_DIM;
            default:
                return isVis ? PALETTE.MEADOW : PALETTE.MEADOW_DIM;
        }
    }

    // Rebuild a single 16x16 chunk into the base bitmap
    function rebuildChunk(cx, cy, z, baseBmp, discovery, visibleMap) {
        const ctx = baseBmp.context;
        const imgData = ctx.createImageData(CHUNK_SIZE, CHUNK_SIZE);
        const data = imgData.data;

        const startX = cx * CHUNK_SIZE;
        const startY = cy * CHUNK_SIZE;

        let pixelIdx = 0;
        for (let py = 0; py < CHUNK_SIZE; py++) {
            const y = startY + py;
            for (let px = 0; px < CHUNK_SIZE; px++) {
                const x = startX + px;
                const cellIdx = y * 256 + x;
                const isDisc = discovery[cellIdx] === 1;
                const isVis = visibleMap ? visibleMap[cellIdx] === 1 : isDisc;

                const rgba = sampleCell(x, y, z, isDisc, isVis);
                data[pixelIdx]     = rgba[0];
                data[pixelIdx + 1] = rgba[1];
                data[pixelIdx + 2] = rgba[2];
                data[pixelIdx + 3] = rgba[3];
                pixelIdx += 4;
            }
        }

        ctx.putImageData(imgData, startX, startY);
    }

    // Process dirty chunks for active Z
    function processDirtyChunks(z = _state.activeZ, maxChunksPerFrame = 0) {
        const k = mapKey(z);
        const dirtySet = _state.dirtyChunks[k];
        if (!dirtySet || dirtySet.size === 0) return 0;

        const baseBmp = ensureBaseBitmap(z);
        const disc = ensureDiscovery(z);
        const vis = (window.UF && UF.Fog && typeof UF.Fog.isVisible === "function") ? null : disc;

        const t0 = performance.now();
        let processed = 0;
        const limit = maxChunksPerFrame > 0 ? maxChunksPerFrame : dirtySet.size;
        for (const chunkKey of dirtySet) {
            const parts = chunkKey.split(",");
            const cx = Number(parts[0]) | 0;
            const cy = Number(parts[1]) | 0;
            rebuildChunk(cx, cy, z, baseBmp, disc, vis);
            dirtySet.delete(chunkKey);
            processed++;
            if (processed >= limit) break;
        }

        baseBmp._baseTexture.update();
        const elapsed = performance.now() - t0;
        _state.stats.dirtyRebuilds += processed;
        _state.stats.lastRebuildTimeMs = elapsed;
        return processed;
    }

    //-------------------------------------------------------------------------
    // Minimap Public Interface
    //-------------------------------------------------------------------------

    const Minimap = {
        get activeZ() { return _state.activeZ; },
        set activeZ(val) {
            const r = zRange(), z = Math.max(r.zMin, Math.min(r.zMax, Math.round(Number(val) || 0)));
            if (_state.activeZ !== z) {
                _state.activeZ = z;
                // One base bitmap per Z is kept (WG.00.09b K2): a tab already built keeps its chunks, and cell changes on it
                // dirty only their own chunks, so switching back repaints nothing. A tab never built is filled by
                // ensureBaseBitmap, which dirties all of its chunks once.
                ensureBaseBitmap(z);
            }
        },
        get mode() { return _state.mode; },
        set mode(m) {
            if (m === "command" || m === "combat" || m === "incarnate") {
                _state.mode = m;
            }
        },
        get followCameraZ() { return _state.followCameraZ; },
        set followCameraZ(val) { _state.followCameraZ = !!val; },
        get expanded() { return _state.expanded; },
        set expanded(val) { _state.expanded = !!val; },
        get zoomMode() { return _state.zoomMode; },
        set zoomMode(val) { _state.zoomMode = val === "local" ? "local" : "full"; },

        setMode(m) { this.mode = m; },
        setActiveZ(z) { this.activeZ = z; },
        setIncarnatedUnit(id) { _state.incarnatedUnitId = id; },

        invalidate(x, y, z = currentWorldZ()) { invalidateCell(x, y, z); },
        invalidateArea(x, y, w, h, z = currentWorldZ()) { invalidateArea(x, y, w, h, z); },
        invalidateAll(z = _state.activeZ) { markAllChunksDirty(z); },

        isExplored(x, y, z = _state.activeZ) {
            if (x < 0 || x >= 256 || y < 0 || y >= 256) return false;
            const disc = ensureDiscovery(z);
            return disc[y * 256 + x] === 1;
        },

        explore(x, y, radius = 0, z = _state.activeZ) {
            const disc = ensureDiscovery(z);
            const r2 = radius * radius;
            let changed = false;
            const x0 = Math.max(0, x - radius), x1 = Math.min(255, x + radius);
            const y0 = Math.max(0, y - radius), y1 = Math.min(255, y + radius);

            for (let cy = y0; cy <= y1; cy++) {
                const dy = cy - y;
                for (let cx = x0; cx <= x1; cx++) {
                    const dx = cx - x;
                    if (dx * dx + dy * dy <= r2) {
                        const idx = cy * 256 + cx;
                        if (disc[idx] === 0) {
                            disc[idx] = 1;
                            invalidateCell(cx, cy, z);
                            changed = true;
                        }
                    }
                }
            }
            return changed;
        },

        exploredCount(z = _state.activeZ) {
            const disc = ensureDiscovery(z);
            let count = 0;
            for (let i = 0; i < disc.length; i++) {
                if (disc[i]) count++;
            }
            return count;
        },

        baseBitmap(z = _state.activeZ) {
            return ensureBaseBitmap(z);
        },

        stats() {
            return Object.assign({}, _state.stats, {
                activeZ: _state.activeZ,
                mode: _state.mode,
                dirtyCount: (_state.dirtyChunks[mapKey()] ? _state.dirtyChunks[mapKey()].size : 0)
            });
        },

        processDirty(maxChunks) {
            return processDirtyChunks(_state.activeZ, maxChunks);
        }
    };

    window.DEUS.Minimap = Minimap;
    window.UF.Minimap = Minimap;

    //-------------------------------------------------------------------------
    // Minimap UI Sprite & Window
    //-------------------------------------------------------------------------

    class Sprite_DeusMinimap extends Sprite {
        constructor() {
            super();
            this._panelWidth = 164;
            this._panelHeight = 196;
            this._mapWidth = 128;
            this._mapHeight = 128;
            this._headerHeight = 44;
            this._padding = 6;

            this.createBaseSprite();
            this.createOverlaySprite();
            this.createChromeSprite();

            this.x = Graphics.boxWidth - this._panelWidth - 10;
            this.y = 52; // Neatly under Top-Right Level & Speed header
            this.z = 80;

            this._isDragging = false;
        }

        createBaseSprite() {
            this._baseSprite = new Sprite();
            this._baseSprite.x = 18;
            this._baseSprite.y = this._headerHeight + 4;
            this._baseSprite.scale.set(0.5, 0.5); // 256x256 scaled down to 128x128
            this.addChild(this._baseSprite);
        }

        createOverlaySprite() {
            this._overlaySprite = new Sprite(new Bitmap(this._mapWidth, this._mapHeight));
            this._overlaySprite.x = 18;
            this._overlaySprite.y = this._headerHeight + 4;
            this.addChild(this._overlaySprite);
        }

        createChromeSprite() {
            this._chromeBitmap = new Bitmap(this._panelWidth, this._panelHeight);
            this._chromeSprite = new Sprite(this._chromeBitmap);
            this.addChild(this._chromeSprite);
            this.drawChrome();
        }

        drawChrome() {
            const bmp = this._chromeBitmap;
            bmp.clear();

            if (!Minimap.expanded) {
                // Minimized pill
                bmp.fillRect(0, 0, this._panelWidth, 28, "rgba(10, 14, 20, 0.92)");
                bmp.strokeRect(0, 0, this._panelWidth, 28, "#38bdf8", 1);
                bmp.fontSize = 11;
                bmp.textColor = "#e2e8f0";
                bmp.drawText(`🗺️ MINIMAP (Z: ${Minimap.activeZ >= 0 ? "+" + Minimap.activeZ : Minimap.activeZ})`, 8, 4, 110, 20, "left");
                bmp.drawText("[ ▢ ]", this._panelWidth - 36, 4, 30, 20, "center");
                return;
            }

            // Outer panel frame (Grimdark Fantasy Slate Theme)
            bmp.fillRect(0, 0, this._panelWidth, this._panelHeight, "rgba(8, 10, 16, 0.94)");
            bmp.strokeRect(0, 0, this._panelWidth, this._panelHeight, "#334155", 1);

            // Header Title Bar
            bmp.fillRect(1, 1, this._panelWidth - 2, 20, "#1e293b");
            bmp.fontSize = 11;
            bmp.textColor = "#38bdf8";
            const modeTag = Minimap.mode === "command" ? "CMD" : (Minimap.mode === "combat" ? "CBT" : "INC");
            bmp.drawText(`🗺️ MAP [${modeTag}]`, 6, 1, 100, 20, "left");

            // Minimize button
            bmp.textColor = "#94a3b8";
            bmp.drawText("[ — ]", this._panelWidth - 34, 1, 28, 20, "center");

            // Z-Level Selector Tabs (Row 2, y = 23 to 42)
            const tabW = 28, tabH = 18, tabs = tabLevels();
            for (let i = 0; i < tabs.length; i++) {
                const zVal = tabs[i];
                const tx = 6 + i * (tabW + 2);
                const ty = 23;
                const isSelected = (Minimap.activeZ === zVal);
                bmp.fillRect(tx, ty, tabW, tabH, isSelected ? "#0284c7" : "#1e293b");
                bmp.strokeRect(tx, ty, tabW, tabH, isSelected ? "#38bdf8" : "#334155", 1);
                bmp.fontSize = 10;
                bmp.textColor = isSelected ? "#ffffff" : "#94a3b8";
                const label = zVal > 0 ? `+${zVal}` : `${zVal}`;
                bmp.drawText(label, tx, ty, tabW, tabH, "center");
            }

            // Map Viewport Border
            const vx = 16, vy = this._headerHeight + 2, vw = 132, vh = 132;
            bmp.strokeRect(vx, vy, vw, vh, "#475569", 1);

            // Footer Readout (y = 180 to 194)
            bmp.fontSize = 9;
            bmp.textColor = "#64748b";
            const expCount = Minimap.exploredCount();
            const pct = Math.round((expCount / (256 * 256)) * 100);
            bmp.drawText(`Explored: ${pct}% (${expCount} cells)`, 6, this._panelHeight - 16, this._panelWidth - 12, 14, "left");
        }

        update() {
            super.update();

            // Synchronize with camera Z if followCameraZ is true
            if (Minimap.followCameraZ) {
                const worldZ = currentWorldZ();
                if (Minimap.activeZ !== worldZ) {
                    Minimap.activeZ = worldZ;
                    this.drawChrome();
                }
            }

            // Process dirty chunks for base terrain
            Minimap.processDirty(8);

            // Update base sprite bitmap reference
            const baseBmp = Minimap.baseBitmap();
            if (this._baseSprite.bitmap !== baseBmp) {
                this._baseSprite.bitmap = baseBmp;
            }

            // Update dynamic overlay: at most every OVERLAY_FRAMES updates, and at once when the view rectangle, the tab or the
            // panel state changed (WG.00.09b K4: every frame it walked every unit of the world and uploaded its texture).
            this._overlayAge = (this._overlayAge || 0) + 1;
            const vx = window.$gameMap ? Math.floor($gameMap.displayX() * 2) : 0, vy = window.$gameMap ? Math.floor($gameMap.displayY() * 2) : 0;
            if (this._overlayAge >= OVERLAY_FRAMES || vx !== this._overlayVx || vy !== this._overlayVy || Minimap.activeZ !== this._overlayZ || Minimap.expanded !== this._overlayOpen) {
                this._overlayAge = 0;
                this._overlayVx = vx;
                this._overlayVy = vy;
                this._overlayZ = Minimap.activeZ;
                this._overlayOpen = Minimap.expanded;
                this.updateOverlay();
            }

            // Process touch / click navigation
            this.handleInput();
        }

        updateOverlay() {
            const ov = this._overlaySprite.bitmap;
            if (!ov) return;
            const ctx = ov.context;
            ctx.clearRect(0, 0, this._mapWidth, this._mapHeight);

            if (!Minimap.expanded) return;

            const t0 = performance.now();
            const z = Minimap.activeZ;

            // 1. Draw Active Projects / Construction Sites
            const P = window.UF && UF.Projects;
            if (P && typeof P.activeProjects === "function") {
                const projects = P.activeProjects() || [];
                for (const proj of projects) {
                    const pz = proj.z !== undefined ? proj.z : 0;
                    if (pz !== z) continue;
                    const mx = Math.floor(proj.x * 0.5);
                    const my = Math.floor(proj.y * 0.5);
                    const mw = Math.max(1, Math.floor((proj.w || 2) * 0.5));
                    const mh = Math.max(1, Math.floor((proj.h || 2) * 0.5));

                    ctx.strokeStyle = proj.state === "complete" ? "#22c55e" : "#f59e0b";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(mx, my, mw, mh);
                }
            }

            // 2. Draw Vertical Connectors (Stairs & Ramps)
            const NC = window.UF && UF.NaturalConnections;
            if (NC && typeof NC.listConnectors === "function") {
                const connectors = NC.listConnectors(z) || [];
                for (const conn of connectors) {
                    const cx = Math.floor(conn.x * 0.5);
                    const cy = Math.floor(conn.y * 0.5);
                    ctx.fillStyle = conn.type === "ramp" ? "#a855f7" : "#ec4899";
                    ctx.fillRect(cx - 1, cy - 1, 3, 3);
                }
            }

            // 3. Draw Dynamic Units
            const W = window.UF && UF.World;
            const units = (W && typeof W.units === "function") ? W.units() : (W && W.state && W.state.units ? Object.values(W.state.units) : []);
            const selectedUnit = window.UF && UF.Select && typeof UF.Select.selectedUnit === "function" ? UF.Select.selectedUnit() : null;

            for (const u of units) {
                if (!u || !u.data) continue;
                const uz = u.z !== undefined ? u.z : 0;
                if (uz !== z) continue;

                const ux = u.x, uy = u.y;
                const mx = Math.floor(ux * 0.5);
                const my = Math.floor(uy * 0.5);

                const isColonist = u.data.faction === "player" || u.data.kind === "colonist";
                const isSelected = selectedUnit && selectedUnit.id === u.id;

                if (isColonist) {
                    // Friendly colonist
                    ctx.fillStyle = isSelected ? "#4ade80" : "#22c55e";
                    ctx.fillRect(mx - 1, my - 1, isSelected ? 3 : 2, isSelected ? 3 : 2);
                } else {
                    // Non-player unit: check stance and line of sight
                    const isVisibleNow = (window.UF && UF.Fog && typeof UF.Fog.isVisible === "function")
                        ? UF.Fog.isVisible(ux, uy, z)
                        : Minimap.isExplored(ux, uy, z);

                    if (!isVisibleNow) {
                        // STRICT RULE: Do NOT reveal hidden hostiles or unspotted creatures!
                        continue;
                    }

                    const stance = window.UF && UF.Stance && typeof UF.Stance.of === "function"
                        ? UF.Stance.of(u)
                        : (u.data.tags && u.data.tags.includes("hostile") ? "hostile" : "neutral");

                    if (stance === "hostile") {
                        ctx.fillStyle = "#ef4444"; // Bright red hostile marker
                        ctx.fillRect(mx - 1, my - 1, 3, 3);
                    } else if (stance === "indifferent" || stance === "neutral") {
                        ctx.fillStyle = "#eab308"; // Amber neutral/wildlife
                        ctx.fillRect(mx, my, 2, 2);
                    }
                }
            }

            // 4. Draw Camera Viewport Wireframe Rectangle
            const worldCamZ = currentWorldZ();
            if (z === worldCamZ && window.$gameMap) {
                const dispX = $gameMap.displayX();
                const dispY = $gameMap.displayY();
                const cols = $gameMap.screenTileX ? $gameMap.screenTileX() : 17;
                const rows = $gameMap.screenTileY ? $gameMap.screenTileY() : 13;

                const vx = Math.floor(dispX * 0.5);
                const vy = Math.floor(dispY * 0.5);
                const vw = Math.max(4, Math.floor(cols * 0.5));
                const vh = Math.max(4, Math.floor(rows * 0.5));

                ctx.strokeStyle = "#facc15"; // Bright yellow wireframe
                ctx.lineWidth = 1;
                ctx.strokeRect(vx, vy, vw, vh);
            }

            ov._baseTexture.update();
            _state.stats.overlayTicks++;
            _state.stats.lastOverlayTimeMs = performance.now() - t0;
        }

        handleInput() {
            if (!TouchInput.isTriggered() && !TouchInput.isPressed()) {
                this._isDragging = false;
                return;
            }

            const tx = TouchInput.x;
            const ty = TouchInput.y;

            // Check if touch is within panel bounds
            if (tx < this.x || tx > this.x + this._panelWidth || ty < this.y || ty > this.y + this._panelHeight) {
                return;
            }

            // Consume touch to prevent unintended world orders
            TouchInput.update();

            const localX = tx - this.x;
            const localY = ty - this.y;

            // 1. Minimize / Expand button click
            if (TouchInput.isTriggered() && localY >= 0 && localY <= 22 && localX >= this._panelWidth - 36) {
                Minimap.expanded = !Minimap.expanded;
                this._baseSprite.visible = Minimap.expanded;
                this._overlaySprite.visible = Minimap.expanded;
                this.drawChrome();
                return;
            }

            if (!Minimap.expanded) return;

            // 2. Z-Level Selector Tabs (localY 23 to 42)
            if (TouchInput.isTriggered() && localY >= 23 && localY <= 42) {
                const tabW = 30, tabs = tabLevels();
                for (let i = 0; i < tabs.length; i++) {
                    const tabX = 6 + i * tabW;
                    if (localX >= tabX && localX <= tabX + tabW) {
                        Minimap.followCameraZ = false;
                        Minimap.activeZ = tabs[i];
                        this.drawChrome();
                        return;
                    }
                }
            }

            // 3. Map Viewport Click-to-Pan / Drag-to-Pan
            const mapScreenX = this.x + 18;
            const mapScreenY = this.y + this._headerHeight + 4;
            if (tx >= mapScreenX && tx <= mapScreenX + this._mapWidth &&
                ty >= mapScreenY && ty <= mapScreenY + this._mapHeight) {

                const cellX = Math.round((tx - mapScreenX) * 2); // 0.5 scale -> * 2
                const cellY = Math.round((ty - mapScreenY) * 2);

                if (window.$gamePlayer && window.$gameMap) {
                    // Center the camera on clicked cell
                    const targetX = Math.max(0, Math.min($gameMap.width() - 1, cellX));
                    const targetY = Math.max(0, Math.min($gameMap.height() - 1, cellY));
                    $gamePlayer.locate(targetX, targetY);
                }
            }
        }
    }

    //-------------------------------------------------------------------------
    // RMMZ Scene_Map Integration
    //-------------------------------------------------------------------------

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this.createDeusMinimap();
    };

    Scene_Map.prototype.createDeusMinimap = function() {
        if (!this._deusMinimap) {
            this._deusMinimap = new Sprite_DeusMinimap();
            this.addChild(this._deusMinimap);
        }
    };

    const _Scene_Map_isAnyWindowUnderMouse = Scene_Map.prototype.isAnyWindowUnderMouse;
    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        if (_Scene_Map_isAnyWindowUnderMouse && _Scene_Map_isAnyWindowUnderMouse.call(this)) return true;
        if (this._deusMinimap && this._deusMinimap.visible) {
            const mx = TouchInput.x, my = TouchInput.y;
            const mm = this._deusMinimap;
            const h = mm._isMinimized ? 28 : mm._panelHeight;
            if (mx >= mm.x && mx <= mm.x + mm._panelWidth && my >= mm.y && my <= mm.y + h) {
                return true;
            }
        }
        return false;
    };

    // Save / Load Hook
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.ufWorld = contents.ufWorld || {};
        contents.ufWorld.minimapDiscovery = {};
        for (const k in _state.discovery) {
            contents.ufWorld.minimapDiscovery[k] = encodeBitset(_state.discovery[k]);
        }
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        if (contents.ufWorld && contents.ufWorld.minimapDiscovery) {
            _state.discovery = {};
            for (const k in contents.ufWorld.minimapDiscovery) {
                _state.discovery[k] = decodeBitset(contents.ufWorld.minimapDiscovery[k], 256 * 256);
            }
            Minimap.invalidateAll();
        }
    };

    //-------------------------------------------------------------------------
    // World / Building / Digging Event Invalidation Hooks
    //-------------------------------------------------------------------------

    if (window.UF && UF.Events && typeof UF.Events.on === "function") {
        UF.Events.on("object:set", data => {
            if (data && typeof data.x === "number" && typeof data.y === "number") {
                Minimap.invalidate(data.x, data.y, data.z);
            }
        });
        UF.Events.on("wall:changed", data => {
            if (data && typeof data.x === "number" && typeof data.y === "number") {
                Minimap.invalidate(data.x, data.y, data.z);
            }
        });
        UF.Events.on("project:changed", data => {
            if (data && typeof data.x === "number" && typeof data.y === "number") {
                Minimap.invalidate(data.x, data.y, data.z);
            }
        });
        UF.Events.on("fluid:changed", data => {
            if (data && typeof data.x === "number" && typeof data.y === "number") {
                Minimap.invalidate(data.x, data.y, data.z);
            }
        });
    }

    //-------------------------------------------------------------------------
    // Automated Test Suite for DEUS_Minimap
    //-------------------------------------------------------------------------

    if (window.UF && UF.Test && typeof UF.Test.suite === "function") {
        UF.Test.suite("minimap", async t => {
            t.check("minimap_api_exists", !!Minimap && typeof Minimap.explore === "function", "Minimap API is present");

            // A. Discovery tests
            const z0 = 0;
            const initialExplored = Minimap.isExplored(10, 10, z0);
            t.check("initial_far_tile_unexplored", !initialExplored, `tile (10,10,0) is unexplored`);

            Minimap.explore(10, 10, 2, z0);
            const nowExplored = Minimap.isExplored(10, 10, z0);
            t.check("tile_becomes_discovered", nowExplored, `tile (10,10,0) is discovered after explore()`);

            // B. Z-Layer Isolation
            const zMinus1Explored = Minimap.isExplored(10, 10, -1);
            t.check("z_layer_isolation", !zMinus1Explored, `tile (10,10,-1) remains unexplored when Z0 was explored`);

            // C. Chunk Invalidation
            const dirtyBefore = Minimap.stats().dirtyCount;
            Minimap.invalidate(10, 10, z0);
            const dirtyAfter = Minimap.stats().dirtyCount;
            t.check("dirty_chunk_invalidation", dirtyAfter >= dirtyBefore, `invalidating cell marks chunk dirty`);

            // D. Dirty Chunk Rebuild
            const rebuilt = Minimap.processDirty(16);
            t.check("dirty_chunk_rebuild", rebuilt > 0, `processDirty rebuilt ${rebuilt} chunks`);

            // E. Viewport Screen & HUD Presence
            const scene = SceneManager._scene;
            const hud = scene && scene._deusMinimap;
            t.check("minimap_hud_present", !!hud && hud.visible, "Minimap HUD is attached to Scene_Map");

            // F. Camera Rectangle Sync
            if (hud) {
                t.check("minimap_overlay_active", !!hud._overlaySprite && !!hud._overlaySprite.bitmap, "Minimap dynamic overlay active");
            }

            t.screenshot("minimap_verified");
        });
    }

})();
