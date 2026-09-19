//=============================================================================
// UF_Walls.js - Two-square wall rendering
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Walls] Draws every wall as a wall square with a roof square directly above it.
 * @author UF project
 * @base UF_Objects
 * @orderAfter UF_Objects
 * @orderBefore UF_Doors
 *
 * @help
 * A wall remains one blocking world-object cell. Its sprite is 48x96: the
 * lower square is the wall face and the upper square is its roof/top. The
 * upper square is visual overhang, so north-south runs remain possible and
 * units north of the wall sort behind it.
 *
 * Approved 48x96 wall sheets are used directly. Until their full connected
 * sets arrive, the current 48x48 connected roof frames receive a code-drawn
 * wall-face placeholder at runtime.
 *
 * API, assets, checks, and limits: docs/systems/UF_Walls.md
 * Replaced core methods: none (aliases UF_Objects.Sprite_Layer methods).
 */

(() => {
    "use strict";

    const TILE = 48;
    const FRAME_COLS = 4;
    const FRAME_ROWS = 5;
    const cache = new Map();
    const provocation = (() => {
        try {
            const argv = (typeof nw !== "undefined" && nw.App && nw.App.argv) || [];
            if (!argv.some(a => a === "--uf-test" || String(a).startsWith("--uf-test="))) return "";
            return String((typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) || "");
        } catch (_) { return ""; }
    })();
    const provokes = name => provocation.split(",").map(s => s.trim()).includes(name) || provocation === "walls.all";

    const Objects = () => (window.UF && UF.Objects) || null;
    const World = () => (window.UF && UF.World) || null;
    const isWallType = type => !!type && (type.autotile === "wall" || (Array.isArray(type.tags) && type.tags.includes("wall")));
    const inBounds = (w, h, x, y) => x >= 0 && y >= 0 && x < w && y < h;

    function isWallCell(grid, w, h, x, y) {
        if (!grid || !inBounds(w, h, x, y)) return false;
        const typeId = grid[y * w + x] | 0;
        const O = Objects();
        return !!(typeId && O && isWallType(O.type(typeId)));
    }

    function maskAt(grid, w, h, x, y) {
        return (isWallCell(grid, w, h, x, y - 1) ? 1 : 0)
            | (isWallCell(grid, w, h, x + 1, y) ? 2 : 0)
            | (isWallCell(grid, w, h, x, y + 1) ? 4 : 0)
            | (isWallCell(grid, w, h, x - 1, y) ? 8 : 0);
    }

    // Frames 0-15 are NESW masks. Frames 16,18,19 are the alternate
    // horizontal north-face run and caps from the wall-set contract.
    function frameIndexAt(grid, w, h, x, y) {
        const mask = maskAt(grid, w, h, x, y);
        if (mask !== 10 && mask !== 8 && mask !== 2) return mask;
        let southSide = false;
        let foundCorner = false;
        for (let cx = x - 1; cx >= Math.max(0, x - 25); cx--) {
            if (!isWallCell(grid, w, h, cx, y)) break;
            const n = isWallCell(grid, w, h, cx, y - 1), s = isWallCell(grid, w, h, cx, y + 1);
            if (s !== n) { southSide = n && !s; foundCorner = true; break; }
        }
        if (!foundCorner) for (let cx = x + 1; cx <= Math.min(w - 1, x + 25); cx++) {
            if (!isWallCell(grid, w, h, cx, y)) break;
            const n = isWallCell(grid, w, h, cx, y - 1), s = isWallCell(grid, w, h, cx, y + 1);
            if (s !== n) { southSide = n && !s; foundCorner = true; break; }
        }
        if (!foundCorner) southSide = isWallCell(grid, w, h, x, y - 1) && !isWallCell(grid, w, h, x, y + 1);
        if (!southSide) return mask;
        return mask === 10 ? 16 : mask === 8 ? 18 : 19;
    }

    function sidecarFor(type) {
        return window.UF && UF.Sidecars && typeof UF.Sidecars.get === "function" && type.image
            ? UF.Sidecars.get(type.image)
            : null;
    }

    function sourceFrame(type, bitmap, index) {
        const sidecar = sidecarFor(type);
        let fw = sidecar && sidecar.frameWidth > 0 ? sidecar.frameWidth | 0 : TILE;
        let fh = sidecar && sidecar.frameHeight > 0 ? sidecar.frameHeight | 0 : TILE;
        if (bitmap.width === TILE && bitmap.height === TILE * 2) { fw = TILE; fh = TILE * 2; }
        const cols = Math.max(1, Math.floor(bitmap.width / fw));
        const rows = Math.max(1, Math.floor(bitmap.height / fh));
        const use = cols >= FRAME_COLS && rows >= FRAME_ROWS ? index : 0;
        return { fw, fh, sx: (use % cols) * fw, sy: Math.floor(use / cols) * fh, sidecar };
    }

    function drawWoodFace(bitmap) {
        bitmap.fillRect(0, TILE, TILE, TILE, "#5a371f");
        for (let x = 0; x < TILE; x += 8) {
            bitmap.fillRect(x, TILE, 2, TILE, "#342317");
            bitmap.fillRect(x + 2, TILE + 1, 2, TILE - 2, "#8a5b34");
            bitmap.fillRect(x + 6, TILE + 2, 1, TILE - 4, "#6f4729");
        }
        bitmap.fillRect(0, TILE + 12, TILE, 3, "#2d2119");
        bitmap.fillRect(0, TILE + 34, TILE, 3, "#2d2119");
    }

    function drawStoneFace(bitmap) {
        bitmap.fillRect(0, TILE, TILE, TILE, "#666866");
        for (let y = TILE; y < TILE * 2; y += 12) {
            bitmap.fillRect(0, y, TILE, 2, "#353837");
            const offset = ((y - TILE) / 12) % 2 ? 8 : 0;
            for (let x = offset; x < TILE; x += 16) bitmap.fillRect(x, y, 2, 12, "#3f4241");
            bitmap.fillRect(0, y + 2, TILE, 1, "#8a8d89");
        }
        bitmap.fillRect(0, TILE * 2 - 2, TILE, 2, "#353837");
    }

    function twoSquareBitmap(type, source, index) {
        const f = sourceFrame(type, source, index);
        if (f.fw === TILE && f.fh === TILE * 2) return { bitmap: source, sx: f.sx, sy: f.sy, direct: true, sidecar: f.sidecar };
        const key = `${type.id}:${index}:${source.width}x${source.height}`;
        let bitmap = cache.get(key);
        if (!bitmap) {
            bitmap = new Bitmap(TILE, TILE * 2);
            bitmap.blt(source, f.sx, f.sy, Math.min(TILE, f.fw), Math.min(TILE, f.fh), 0, 0, TILE, TILE);
            if (Array.isArray(type.tags) && type.tags.includes("wood")) drawWoodFace(bitmap);
            else drawStoneFace(bitmap);
            bitmap._ufName = `UF_GenTwoSquareWall_${type.id}_${index}`;
            cache.set(key, bitmap);
        }
        return { bitmap, sx: 0, sy: 0, direct: false, sidecar: f.sidecar };
    }

    function visualCells(x, y) {
        return [{ x, y: y - 1, role: "roof" }, { x, y, role: "wall" }];
    }

    function baseAt(area, x, y) {
        const O = Objects(), W = World();
        if (!O || !area) return null;
        const z = area.z === undefined ? 0 : area.z;
        if (!Number.isInteger(z) || z < -2 || z > 2 || (z !== 0 && !(W &&
            typeof W.viewLevel === "function" && typeof W.levelKey === "function" && typeof W.levelOfMapId === "function"))) return null;
        const same = O.atIn(area, x, y);
        if (isWallType(same)) return { area, x, y, type: same, role: "wall" };
        if (same) return null;
        const below = O.atIn(area, x, y + 1);
        return isWallType(below) ? { area, x, y: y + 1, type: below, role: "roof" } : null;
    }

    let patched = false;
    function patchObjectLayer() {
        const O = Objects();
        const Layer = O && O.Sprite_Layer;
        if (patched || !Layer || Layer.prototype._ufTwoSquareWalls) return !!patched;
        patched = true;
        const p = Layer.prototype;
        p._ufTwoSquareWalls = true;
        const baseTryFrame = p._tryFrame;
        const baseRebuild = p._rebuild;

        p._tryFrame = function(sprite, type) {
            const ok = baseTryFrame.call(this, sprite, type);
            if (!ok || !isWallType(type) || provokes("walls.two_cell_render")) return ok;
            const map = window.$dataMap, grid = map && map.ufObjects;
            const source = this._bitmaps && this._bitmaps[type.typeId];
            if (!grid || !source || !source.isReady()) return ok;
            const index = frameIndexAt(grid, map.width, map.height, sprite._ufX, sprite._ufY);
            const made = twoSquareBitmap(type, source, index);
            sprite.bitmap = made.bitmap;
            sprite.setFrame(made.sx, made.sy, TILE, TILE * 2);
            const anchor = made.sidecar && Array.isArray(made.sidecar.anchor) && made.sidecar.anchor.length === 2 && made.sidecar.frameHeight >= TILE * 2
                ? made.sidecar.anchor
                : [TILE / 2, TILE * 2 - 1];
            sprite.anchor.set(anchor[0] / TILE, anchor[1] / (TILE * 2));
            sprite._ufWallRenderKey = `${index}:${made.direct ? "direct" : "placeholder"}`;
            sprite._ufWallFrame = index;
            sprite._ufReady = true;
            sprite.visible = true;
            return true;
        };

        p._rebuild = function(map, dx, dy, force) {
            baseRebuild.call(this, map, dx, dy, force);
            if (!map || !map.ufObjects || !this._active) return;
            const O2 = Objects();
            for (const sprite of this._active.slice()) {
                const type = O2 && O2.type(sprite._ufType);
                if (!isWallType(type)) continue;
                const index = frameIndexAt(map.ufObjects, map.width, map.height, sprite._ufX, sprite._ufY);
                if (!sprite._ufWallRenderKey || !sprite._ufWallRenderKey.startsWith(`${index}:`)) this._assign(sprite, type, sprite._ufX, sprite._ufY);
            }
        };
        if (O.refresh) O.refresh();
        return true;
    }

    const Walls = {
        TILE,
        enabled: true,
        isWallType,
        isWallCell,
        maskAt,
        frameIndexAt,
        visualCells,
        baseAt,
        patchObjectLayer,
        clearCache() { cache.clear(); const O = Objects(); if (O && O.refresh) O.refresh(); },
        footprint: [1, 2]
    };
    window.UF = window.UF || {};
    window.UF.Walls = Walls;
    patchObjectLayer();

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        patchObjectLayer();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("walls", async t => {
            const W = World(), O = Objects(), area = W && W.currentArea();
            const wood = O && O.type("wall_wood"), stone = O && O.type("wall_stone");
            t.check("catalog", isWallType(wood) && isWallType(stone),
                `${wood ? `${wood.id}:${wood.image}` : "wall_wood missing"}; ${stone ? `${stone.id}:${stone.image}` : "wall_stone missing"}`);
            t.check("contract", Walls.footprint[0] === 1 && Walls.footprint[1] === 2 && visualCells(10, 10)[0].y === 9,
                `footprint [${Walls.footprint.join(",")}]; roof cell (${visualCells(10, 10)[0].x},${visualCells(10, 10)[0].y}); wall cell (10,10)`);
            if (!area || !wood || !window.$gameMap) {
                t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
                return;
            }

            const size = W.state.size;
            const units = W.units().filter(u => u.area && u.area.x === area.x && u.area.y === area.y);
            let center = null;
            for (let r = 0; r <= 60 && !center; r++) for (let dy = -r; dy <= r && !center; dy++) for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const x = Math.max(4, Math.min(size - 5, $gamePlayer.x + dx));
                const y = Math.max(4, Math.min(size - 5, $gamePlayer.y + dy));
                if (units.some(u => Math.abs(u.x - x) <= 3 && Math.abs(u.y - y) <= 3)) continue;
                center = { x, y };
                break;
            }
            if (!center) center = { x: Math.max(4, Math.min(size - 5, $gamePlayer.x)), y: Math.max(4, Math.min(size - 5, $gamePlayer.y)) };
            const saved = [], oldView = { x: $gamePlayer.x, y: $gamePlayer.y };
            for (let y = center.y - 3; y <= center.y + 3; y++) for (let x = center.x - 3; x <= center.x + 3; x++) {
                saved.push({ x, y, id: O.typeIdIn(area, x, y) });
                O.setIn(area, x, y, null);
            }
            O.setIn(area, center.x - 1, center.y, "wall_wood");
            O.setIn(area, center.x, center.y, "wall_wood");
            O.setIn(area, center.x + 1, center.y, "wall_wood");
            O.setIn(area, center.x + 2, center.y + 2, "wall_stone");
            $gamePlayer.locate(center.x, center.y + 4);
            O.refresh();
            await t.waitUntil(() => {
                const s = O.spriteAt(center.x, center.y);
                return !!s && s.visible && s._frame && s._frame.height >= TILE * 2;
            }, 5000, "two-square wall sprite").catch(() => {});
            await t.waitFrames(2);

            const map = window.$dataMap, sprite = O.spriteAt(center.x, center.y);
            const left = O.spriteAt(center.x - 1, center.y), right = O.spriteAt(center.x + 1, center.y);
            const heightOk = !!sprite && sprite._frame.height === TILE * 2;
            const anchorOk = !!sprite && Math.abs(sprite.anchor.x - 0.5) < 0.01 && sprite.anchor.y > 0.98;
            const top = sprite ? sprite.y - sprite._frame.height * sprite.anchor.y : NaN;
            const baseTop = ($gameMap.adjustY(center.y)) * TILE;
            t.check("two_cell_render", heightOk && anchorOk && top <= baseTop - TILE + 2,
                sprite ? `frame ${sprite._frame.width}x${sprite._frame.height}; anchor (${sprite.anchor.x.toFixed(3)},${sprite.anchor.y.toFixed(3)}); roof top ${top.toFixed(1)}, wall-cell top ${baseTop.toFixed(1)}` : "center wall sprite missing");
            t.check("connected_frames", !!left && !!sprite && !!right && left._ufWallFrame === 2 && sprite._ufWallFrame === 10 && right._ufWallFrame === 8,
                `west/center/east frames ${left && left._ufWallFrame}/${sprite && sprite._ufWallFrame}/${right && right._ufWallFrame} (want 2/10/8)`);

            const atRoof = baseAt(area, center.x, center.y - 1);
            const baseBlocked = O.blocksIn(area, center.x, center.y);
            const roofHasObject = !!O.atIn(area, center.x, center.y - 1);
            t.check("footprint_roles", !!atRoof && atRoof.role === "roof" && atRoof.y === center.y && baseBlocked && !roofHasObject,
                `${atRoof ? `roof resolves to ${atRoof.type.id} base (${atRoof.x},${atRoof.y})` : "roof did not resolve"}; base blocked ${baseBlocked}; roof grid cell ${roofHasObject ? "contains an object" : "is visual overhang"}`);

            t.screenshot("two_square_wall");

            const loops = 10000, p0 = performance.now();
            for (let i = 0; i < loops; i++) frameIndexAt(map.ufObjects, map.width, map.height, center.x, center.y);
            const ms = performance.now() - p0;
            t.check("perf", ms / loops <= 0.005, `${loops} connected-frame lookups in ${ms.toFixed(3)} ms = ${(ms / loops).toFixed(6)} ms/call (budget 0.005)`);

            for (const cell of saved) O.setIn(area, cell.x, cell.y, cell.id || null);
            $gamePlayer.locate(oldView.x, oldView.y);
            O.refresh();
            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
        }, { isDefault: false });
    }
})();
