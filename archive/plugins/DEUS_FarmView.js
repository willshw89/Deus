/*:
 * @target MZ
 * @plugindesc [DEUS FarmView] Saved farm-stage markers and factual cultivation tooltips.
 * @author Codex
 * @base DEUS_Agriculture
 * @orderAfter DEUS_Agriculture
 * @orderAfter DEUS_Look
 * @help
 * Read-only view of persistent plots. The farm_plot object remains the real
 * cultivated bed; small code-drawn crop-stage placeholders are not final art.
 * No growth, orders, item creation or saved UI state. No overhead action text.
 * Replaced core methods: none. See docs/systems/UF_FarmView.md.
 */
(() => {
    "use strict";
    const UF = window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    const A = () => UF.Agriculture;
    const W = () => UF.World;
    const PREFIX = "Cultivation: ";
    const PHASES = { reserved: "Reserved ground", tilled: "Prepared bed", growing: "Growing", ripe: "Ready to harvest" };
    const bitmaps = new Map();
    const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    function model(plot) {
        if (!plot || !plot.area || !Number.isInteger(zOf(plot)) || !PHASES[plot.phase]) return null;
        const crop = A() && A().crops().find(c => c.id === plot.cropId);
        const duration = crop && crop.growthMinutes;
        const ratio = plot.phase === "ripe" ? 1 : duration > 0 ? Math.max(0, Math.min(1, (plot.growthMinutes || 0) / duration)) : 0;
        return { id: plot.id, cropId: plot.cropId, name: crop && crop.name || plot.cropId,
            area: { x: plot.area.x, y: plot.area.y }, x: plot.x, y: plot.y, z: zOf(plot), phase: plot.phase,
            phaseText: PHASES[plot.phase], progress: Math.floor(ratio * 100), stage: Math.min(3, Math.floor(ratio * 4)),
            needsCare: plot.phase === "growing" && !(plot.careMinutes > 0), reason: plot.reason || null };
    }
    function inspect(ref) {
        return A() && typeof A().at === "function" ? model(A().at(ref)) : null;
    }
    function lines(ref) {
        const m = inspect(ref);
        if (!m) return [];
        const result = [`${PREFIX}${m.name} — ${m.phaseText}${m.phase === "growing" ? ` ${m.progress}%` : ""}`];
        if (m.needsCare) result.push("Farm condition: tending required; growth is paused.");
        else if (m.reason) result.push(`Farm condition: ${String(m.reason).slice(0, 100)}`);
        return result;
    }
    function decorate(input, x, y) {
        if (!input || input[0] === "Unexplored") return input;
        const out = input.filter(s => typeof s !== "string" || !s.startsWith(PREFIX) && !s.startsWith("Farm condition: "));
        const view = W() && W().viewLevel();
        if (view) out.push(...lines({ area: { x: view.x, y: view.y }, x, y, z: view.z }));
        return out;
    }
    function bitmap(m) {
        const key = `${m.cropId}:${m.phase}:${m.stage}:${m.needsCare}`;
        if (bitmaps.has(key)) return bitmaps.get(key);
        const b = new Bitmap(48, 48);
        // Temporary native-resolution indicators, deliberately distinct from the
        // actual FarmPlot artwork and never used as a simulation authority.
        const edge = m.phase === "ripe" ? "#F7E7A6" : m.needsCare ? "#BE825D" : "#8A9A61";
        if (m.phase === "reserved") {
            for (let n = 5; n < 43; n += 8) {
                b.fillRect(n, 5, 4, 2, edge); b.fillRect(n, 41, 4, 2, edge);
                b.fillRect(5, n, 2, 4, edge); b.fillRect(41, n, 2, 4, edge);
            }
        } else {
            b.fillRect(5, 42, 38, 3, "#39451C");
            b.fillRect(5, 42, m.phase === "growing" || m.phase === "ripe" ? 8 + m.stage * 10 : 3, 3, edge);
        }
        if (m.phase === "growing" || m.phase === "ripe") {
            const fungus = m.cropId === "mushroom";
            for (const [x, y] of [[12, 20], [29, 20], [20, 33]]) {
                const tall = 3 + m.stage * 2;
                b.fillRect(x, y - tall, 3, tall, fungus ? "#CEC6BE" : "#39451C");
                if (fungus) {
                    b.fillRect(x - 2 - m.stage, y - tall - 2, 7 + m.stage * 2, 3, "#71AEE7");
                    b.fillRect(x - 1, y - tall - 3, 5, 1, "#B2D7F3");
                } else {
                    b.fillRect(x - 3, y - tall, 9, 3, "#71864D");
                    b.fillRect(x - 1, y - tall - 3, 5, 3, "#8A9A61");
                }
            }
        }
        bitmaps.set(key, b); return b;
    }
    class FarmMarkers {
        constructor(tilemap) { this.tilemap = tilemap; this.pool = []; }
        update() {
            for (const sprite of this.pool) sprite.visible = false;
            const view = W() && W().viewLevel(), a = A();
            if (!view || !a || !window.$gameMap || !a.peek()) return;
            let n = 0;
            for (const plot of a.plots({ area: { x: view.x, y: view.y }, z: view.z })) {
                const m = model(plot); if (!m) continue;
                const sx = $gameMap.adjustX(m.x), sy = $gameMap.adjustY(m.y);
                if (sx < -1 || sy < -1 || sx > $gameMap.screenTileX() + 1 || sy > $gameMap.screenTileY() + 1) continue;
                let sprite = this.pool[n++];
                if (!sprite) { sprite = new Sprite(); sprite.anchor.set(0.5, 1); this.pool.push(sprite); this.tilemap.addChild(sprite); }
                sprite.bitmap = bitmap(m); sprite.x = Math.round((sx + 0.5) * 48); sprite.y = Math.round((sy + 1) * 48);
                sprite.z = Math.max(7, sprite.y - 2); sprite.visible = true; sprite._ufFarm = m;
            }
        }
    }
    const chars = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() { chars.call(this); this._ufFarmMarkers = new FarmMarkers(this._tilemap); };
    const update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() { update.call(this); if (this._ufFarmMarkers) this._ufFarmMarkers.update(); };
    let hooked = false;
    function hookLook() {
        const look = UF.Look; if (hooked || !look) return;
        hooked = true;
        const desc = look.describeCell, inspectCell = look.inspect;
        if (desc) look.describeCell = function(x, y) { return decorate(desc.call(this, x, y), x, y); };
        if (inspectCell) look.inspect = function(x, y) {
            const info = inspectCell.call(this, x, y);
            return info && Object.assign({}, info, { lines: decorate(info.lines, x, y) });
        };
        // Look's live hover invokes its closure-local inspect, so its documented
        // TipSprite seam is also needed; public facade aliases alone are not enough.
        if (look.TipSprite && look.TipSprite.prototype.update) {
            const tipUpdate = look.TipSprite.prototype.update;
            look.TipSprite.prototype.update = function() {
                tipUpdate.call(this);
                if (this.visible && this._cell && !this._pin) this.setLines(decorate(this._lines, this._cell.x, this._cell.y));
            };
        }
    }
    const boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { hookLook(); boot.call(this); };
    UF.FarmView = { model, inspect, lines, decorate,
        markers: () => { const s = SceneManager._scene, m = s && s._spriteset && s._spriteset._ufFarmMarkers; return m ? m.pool.filter(p => p.visible) : []; } };
})();
