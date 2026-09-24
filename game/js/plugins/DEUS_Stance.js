//=============================================================================
// DEUS_Stance.js - A colored ring under every unit's feet: friendly, indifferent, hostile
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Stance] Diplomatic stance indicators: colored selection rings reflecting unit disposition (friendly, neutral, hostile).
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_Factions
 * @orderAfter DEUS_ColonyOverseer
 *
 * @help
 * The stance of a unit toward your colony (VISION V32; circles since the
 * user's request of 2026-09-19 14:40, squares before):
 *   friendly     your colonists, anything of faction "player", and members
 *                of factions that are allied or friendly with your colony
 *   indifferent  wildlife, and members of neutral factions
 *   hostile      monsters, and members of factions that are hostile to or
 *                at war with your colony
 *
 * Markers are flattened pixel-art ellipses drawn in code pixel by pixel
 * (UF_GenStance_friendly, UF_GenStance_indifferent, UF_GenStance_hostile):
 * a filled disc at the catalog's alpha inside a darker rim, 40x20 under a
 * one-square (48 px) creature and proportionally larger under bigger ones
 * (80x40 under a 96 px creature). The feet stand in the middle of the ring.
 * They sit inside the map's tilemap at z = foot row - 50 (above the ground
 * and the grass on the cell, under the character), one per unit event in
 * view, following the character every frame. A marker goes away when its
 * unit leaves the view or the map, or is transparent. The pair's start
 * events (note contains "<colonist", before UF_Colonists) get a friendly
 * marker too.
 *
 * The selected unit gets a bright iron ring a little larger than its stance
 * ring (UF_GenSelect, 44x22 per square of footprint, open in the middle),
 * pulsing by swapping three pre-drawn frames (dim, bright, brightest).
 *
 * Nothing is saved: a stance is read from unit.data and the factions'
 * relations whenever it's asked for.
 *
 * API and checks: docs/systems/UF_Stance.md
 * Architecture: docs/design/WORLD_ARCHITECTURE.md (sections 4 and 5.9)
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const SIZE = 48; // one grid square
    // WORLD_ARCHITECTURE §4 (revised 2026-09-18): characters draw at z = their foot pixel row (UF_Perspective25D),
    // flat "under" objects (grass, stones) at foot row - 100 (UF_Objects), so a marker sits at foot row - 50: above
    // the grass on its cell, behind the person standing on it. Never below the ground layers (z 0 and 4).
    const Z_BELOW_FEET = 50;
    const Z_MIN = 1;
    const markerZ = foot => Math.max(Z_MIN, foot - Z_BELOW_FEET);
    const Z = Z_MIN; // kept for API compatibility: the lowest z a marker uses
    const STANCES = ["friendly", "indifferent", "hostile"];
    const BITMAP_NAMES = { friendly: "UF_GenStance_friendly", indifferent: "UF_GenStance_indifferent", hostile: "UF_GenStance_hostile" };
    const LABELS = { friendly: "Friendly", indifferent: "Indifferent", hostile: "Hostile" };
    const DEFAULTS = { colors: { friendly: "#22c55e", indifferent: "#eab308", hostile: "#ef4444" }, alpha: 0.45 };
    const OUTLINE_DARKEN = 0.55; // rim color = fill color x this
    const OUTLINE_EXTRA_ALPHA = 0.4; // the rim is more opaque than the fill so the ring reads at zoom 1/3
    const VIEW_MARGIN = 1;       // cells beyond the screen edge that still get a marker

    // Glowing green selection ring geometry (per user directive 2026-09-22:
    // no indicator of alliance under creatures; glowing green ring under selected units).
    const RING = { w: 48, h: 48 };        // legacy stance square
    const SELECT_RING = { w: 44, h: 22 }; // glowing green selection ring
    const CENTER_ABOVE = 24;
    const MAX_CELLS = 4;
    const rimWidth = cells => 1 + cells;
    const selectBandWidth = cells => 2 + cells;
    const clampCells = c => Math.max(1, Math.min(MAX_CELLS, Math.round(Number(c) || 1)));
    const ringSize = cells => ({ w: RING.w * clampCells(cells), h: RING.h * clampCells(cells) });
    const selectRingSize = cells => ({ w: SELECT_RING.w * clampCells(cells), h: SELECT_RING.h * clampCells(cells) });
    // anchor.y: 1 for stance square (bottom edge at feet), 0.5 for selection ring (centered on feet)
    const ringAnchorY = (h, cells) => 1;
    const selectAnchorY = 0.5;

    //-------------------------------------------------------------------------
    // Catalog and colors

    const catalog = () => (window.$ufWorldCatalog && $ufWorldCatalog.stance) || null;
    const colorOf = stance => {
        const c = catalog();
        return (c && c.colors && c.colors[stance]) || DEFAULTS.colors[stance];
    };
    const alphaOf = () => {
        const c = catalog();
        const a = c && typeof c.alpha === "number" ? c.alpha : DEFAULTS.alpha;
        return Math.max(0, Math.min(1, a));
    };
    const hexToRgb = hex => {
        const n = parseInt(String(hex).replace("#", ""), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const darken = (rgb, f) => rgb.map(v => Math.round(v * f));

    //-------------------------------------------------------------------------
    // The public object

    const Stance = {
        STANCES,
        Z,
        SIZE,
        RING,
        SELECT_RING,
        bitmapNames: BITMAP_NAMES,
        /** false hides alliance markers under unselected units (per user directive: no indicator of alliance). */
        showAlliance: false,
        /** false hides every marker (development toggle; not saved). */
        enabled: true
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Stance = Stance;
    Stance.ringSize = ringSize;
    Stance.selectRingSize = selectRingSize;

    //-------------------------------------------------------------------------
    // Rules (WORLD_ARCHITECTURE §5.9)

    function stanceOfUnit(u) {
        const d = (u && u.data) || {};
        if (d.kind === "colonist" || d.faction === "player") return "friendly";
        if (d.faction) {
            const F = window.UF.Factions;
            const tier = F && F.tierBetween ? F.tierBetween("player", d.faction).id : "neutral";
            if (tier === "allied" || tier === "friendly") return "friendly";
            if (tier !== "hostile" && tier !== "war") return "indifferent";
            // Hostile/war factions: only explicitly military units attack,
            // and only after year 10.  Before that every faction focuses on
            // its own expansion and development.
            const PEACE_YEARS = 10;
            const year = window.$ufTime ? ($ufTime.year | 0) : 1;
            if (year < PEACE_YEARS && !(window.UF && UF.Test && UF.Test.active)) return "indifferent";

            const tags = Array.isArray(d.tags) ? d.tags : [];
            const isMilitary = tags.includes("hostile") || tags.includes("raider") ||
                tags.includes("soldier") || tags.includes("warband") || tags.includes("military") ||
                tags.includes("scout") || tags.includes("guard");
            if (isMilitary) return "hostile";
            // Non-military members of hostile factions are wary but not aggressive
            return "indifferent";
        }
        const tags = Array.isArray(d.tags) ? d.tags : [];
        return tags.includes("monster") ? "hostile" : "indifferent";
    }

    // The pre-Colonists start pair: generator events whose note contains "<colonist". Cached per
    // Game_Event in a WeakMap (not on the event itself, which is saved with the map).
    const colonistNotes = new WeakMap();
    function isColonistEvent(ev) {
        let v = colonistNotes.get(ev);
        if (v === undefined) {
            const data = ev.event ? ev.event() : null;
            v = !!(data && typeof data.note === "string" && data.note.includes("<colonist"));
            colonistNotes.set(ev, v);
        }
        return v;
    }

    function stanceOfCharacter(ch) {
        if (!(ch instanceof Game_Event)) return null;
        const W = window.UF.World;
        const unit = W && W.unitOfEvent ? W.unitOfEvent(ch) : null;
        if (unit) return stanceOfUnit(unit);
        return isColonistEvent(ch) ? "friendly" : null;
    }

    /** "friendly" | "indifferent" | "hostile" for a unit record, unit id or Game_Event; null for anything that isn't a unit. */
    Stance.of = function(x) {
        if (x === null || x === undefined) return null;
        if (typeof x === "number") {
            const u = window.UF.World ? UF.World.unit(x) : null;
            return u ? stanceOfUnit(u) : null;
        }
        if (x instanceof Game_CharacterBase) return stanceOfCharacter(x);
        if (typeof x === "object" && x.data && typeof x.data === "object") return stanceOfUnit(x);
        return null;
    };
    Stance.label = stance => LABELS[stance] || "";
    /** Label for the look window ("Friendly", "Indifferent", "Hostile"; "" for non-units). */
    Stance.describe = x => Stance.label(Stance.of(x));
    Stance.color = stance => colorOf(stance);
    Stance.alpha = alphaOf;
    Stance.colors = () => Object.fromEntries(STANCES.map(s => [s, colorOf(s)]));
    Stance.setEnabled = on => {
        Stance.enabled = !!on;
    };

    //-------------------------------------------------------------------------
    // Footprint: how many squares wide the creature is drawn (V44: larger beings use bigger sheets)

    /** Width in px of the frame the character sprite draws (0 while its sheet loads). */
    function frameWidthOf(sprite) {
        if (!sprite) return 0;
        const f = sprite._frame;
        if (f && f.width > 0) return f.width;
        const ub = sprite._upperBody; // in a bush RPG Maker draws two half-bodies and gives the sprite a 0-wide frame
        return ub && ub._frame && ub._frame.width > 0 ? ub._frame.width : 0;
    }
    /** Squares of footprint for a character sprite: its drawn frame width / 48, rounded, 1..4 (1 until the sheet loads). */
    Stance.cellsOf = sprite => {
        const w = frameWidthOf(sprite);
        return w > 0 ? clampCells(w / SIZE) : 1;
    };

    //-------------------------------------------------------------------------
    // Pixel-art squares, built pixel by pixel (per user directive 2026-09-22)

    /** A w x h bitmap: each pixel of the square gets colorAt(depth, x, y) = [r, g, b, a] or null (clear). Nearest-neighbour scaling. */
    function paintSquare(w, h, colorAt) {
        const bmp = new Bitmap(w, h);
        bmp.smooth = false; // stepped edges at zoom 2/3 and 1/3 too, like pixel art
        const img = bmp.context.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const depth = Math.min(x, y, w - 1 - x, h - 1 - y) + 1;
                const c = colorAt(depth, x, y);
                if (c) {
                    const i = (y * w + x) * 4;
                    img.data[i] = c[0];
                    img.data[i + 1] = c[1];
                    img.data[i + 2] = c[2];
                    img.data[i + 3] = c[3];
                }
            }
        }
        bmp.context.putImageData(img, 0, 0);
        bmp._baseTexture.update();
        return bmp;
    }

    //-------------------------------------------------------------------------
    // Stance squares: UF_GenStance_<stance>, 48x48 per square of footprint, rebuilt if the catalog colors change.
    // A filled square at the catalog alpha inside a rim of the same color x 0.55 at alpha + 0.4.
    // The crisp rim gives the square its clean edge and the 45% fill keeps the feet and the ground visible.

    const bitmaps = {}; // bitmaps[stance][cells]
    Stance.bitmap = function(stance, cells = 1) {
        if (!STANCES.includes(stance)) return null;
        const c = clampCells(cells);
        const color = colorOf(stance), a = alphaOf();
        const byCells = bitmaps[stance] || (bitmaps[stance] = []);
        const cached = byCells[c];
        if (cached && cached._ufColor === color && cached._ufAlpha === a) return cached;
        const rgb = hexToRgb(color), rim = darken(rgb, OUTLINE_DARKEN);
        const fill = [rgb[0], rgb[1], rgb[2], Math.round(a * 255)];
        const edge = [rim[0], rim[1], rim[2], Math.round(Math.min(1, a + OUTLINE_EXTRA_ALPHA) * 255)];
        const R = rimWidth(c), size = ringSize(c);
        const b = paintSquare(size.w, size.h, depth => (depth <= R ? edge : fill));
        b._ufName = BITMAP_NAMES[stance];
        b._ufColor = color;
        b._ufAlpha = a;
        b._ufCells = c;
        b._ufRim = R;
        byCells[c] = b;
        return b;
    };

    //-------------------------------------------------------------------------
    // The selection ring: a radiant glowing green ground ring with bright pulse,
    // drawn under the sprite at the unit's feet. Generated (UF_GenSelect).

    const SELECT_NAME = "UF_GenSelect";
    const SELECT_SEQUENCE = [0, 1, 2, 1];
    const SELECT_STEP = 10; // frames per pulse step: a 40-frame cycle
    const PULSE_FRAMES = SELECT_SEQUENCE.length * SELECT_STEP;
    const selectBitmaps = []; // selectBitmaps[cells][frame]

    Stance.enableGlow = false;  // Glow halo disabled per user directive
    Stance.enablePulse = false; // Pulse animation disabled per user directive

    /**
     * Paints a clean, crisp green ellipse ring.
     * Glow halo and pulse animation are disabled per user directive.
     */
    function paintGlowingRing(w, h, pulseFrame) {
        const bmp = new Bitmap(w, h);
        bmp.smooth = false;
        const img = bmp.context.createImageData(w, h);
        const cx = (w - 1) / 2;
        const cy = (h - 1) / 2;
        const rx = (w - 1) / 2;
        const ry = (h - 1) / 2;

        if (!Stance.enableGlow) {
            // Clean, static, non-glowing tactical ring (no outer halo, no blur)
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const dx = (x - cx) / rx;
                    const dy = (y - cy) / ry;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d >= 0.76 && d <= 1.00) {
                        const i = (y * w + x) * 4;
                        img.data[i] = 34;     // R
                        img.data[i + 1] = 197; // G
                        img.data[i + 2] = 94;  // B
                        img.data[i + 3] = 255; // Solid A (crisp, zero glow halo)
                    }
                }
            }
            bmp.context.putImageData(img, 0, 0);
            bmp._baseTexture.update();
            return bmp;
        }

        // Glowing green pulse states (0: emerald, 1: vivid neon green, 2: radiant mint-white peak)
        const pulses = [
            {
                outerGlow: [22, 163, 74, 140],   // #16a34a emerald halo
                body:      [34, 197, 94, 255],   // #22c55e vivid green
                core:      [74, 222, 128, 255]   // #4ade80 neon core
            },
            {
                outerGlow: [34, 197, 94, 170],   // #22c55e green halo
                body:      [74, 222, 128, 255],  // #4ade80 neon green
                core:      [134, 239, 172, 255]  // #86efac bright mint
            },
            {
                outerGlow: [74, 222, 128, 200],  // #4ade80 bright halo
                body:      [134, 239, 172, 255], // #86efac mint green
                core:      [220, 252, 231, 255]  // #dcfce7 luminous white-green core
            }
        ];
        const p = pulses[pulseFrame % pulses.length];

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dx = (x - cx) / rx;
                const dy = (y - cy) / ry;
                const d = Math.sqrt(dx * dx + dy * dy);

                // Ellipse ring: peak at d0 = 0.85, outer limit 1.02, inner limit 0.68
                if (d >= 0.68 && d <= 1.02) {
                    const distFromCore = Math.abs(d - 0.85) / 0.17;
                    let r, g, b, a;
                    if (distFromCore <= 0.35) {
                        const t = distFromCore / 0.35;
                        r = Math.round(p.core[0] * (1 - t) + p.body[0] * t);
                        g = Math.round(p.core[1] * (1 - t) + p.body[1] * t);
                        b = Math.round(p.core[2] * (1 - t) + p.body[2] * t);
                        a = Math.round(p.core[3] * (1 - t) + p.body[3] * t);
                    } else {
                        const t = (distFromCore - 0.35) / 0.65;
                        r = Math.round(p.body[0] * (1 - t) + p.outerGlow[0] * t);
                        g = Math.round(p.body[1] * (1 - t) + p.outerGlow[1] * t);
                        b = Math.round(p.body[2] * (1 - t) + p.outerGlow[2] * t);
                        a = Math.round(p.body[3] * (1 - t) + p.outerGlow[3] * t);
                    }
                    const i = (y * w + x) * 4;
                    img.data[i] = r;
                    img.data[i + 1] = g;
                    img.data[i + 2] = b;
                    img.data[i + 3] = a;
                }
            }
        }
        bmp.context.putImageData(img, 0, 0);
        bmp._baseTexture.update();
        return bmp;
    }

    /** Index of the selection ring frame (0 dim, 1 bright, 2 brightest) at a frame count. */
    Stance.selectFrame = frameCount => Stance.enablePulse
        ? SELECT_SEQUENCE[Math.floor(Math.max(0, Number(frameCount) || 0) / SELECT_STEP) % SELECT_SEQUENCE.length]
        : 0;
    Stance.SELECT_FRAMES = 3;
    Stance.SELECT_NAME = SELECT_NAME;
    Stance.PULSE_FRAMES = PULSE_FRAMES;
    /** The selection ring bitmap for a pulse frame (default: the current one) and a footprint in squares (default 1). */
    Stance.selectBitmap = function(frame, cells = 1) {
        const f = frame === undefined || frame === null ? Stance.selectFrame(Graphics.frameCount) : Math.max(0, Math.min(2, frame | 0));
        const c = clampCells(cells);
        const glowMode = Stance.enableGlow ? 1 : 0;
        const byCells = selectBitmaps[c] || (selectBitmaps[c] = {});
        const byMode = byCells[glowMode] || (byCells[glowMode] = []);
        if (byMode[f]) return byMode[f];
        const size = selectRingSize(c);
        const b = paintGlowingRing(size.w, size.h, f);
        b._ufName = SELECT_NAME;
        b._ufFrame = f;
        b._ufCells = c;
        byMode[f] = b;
        return b;
    };
    /** Kept for callers of the old opacity pulse: the pulse is drawn in the frames now, so the opacity stays 255. */
    Stance.pulse = () => 255;

    let explicitSelection = null; // Game_CharacterBase set through setSelected; null = follow the Overseer's selection
    /** Mark a unit (record, id or Game_Event) as the targeted one; null clears it. The Overseer's selection is used when nothing is set. */
    Stance.setSelected = function(x) {
        if (x === null || x === undefined) { explicitSelection = null; return; }
        if (x instanceof Game_CharacterBase) explicitSelection = x;
        else if (typeof x === "number") explicitSelection = window.UF.World ? UF.World.eventOf(x) : null;
        else if (typeof x === "object" && typeof x.id === "number") explicitSelection = window.UF.World ? UF.World.eventOf(x.id) : null;
    };
    /** The character the selection ring follows: an explicit selection, else the Overseer's selected colonist's event. */
    Stance.selectedCharacter = function() {
        if (explicitSelection) return explicitSelection;
        const cm = window.$colonyManager;
        const sel = cm && cm.selectedColonist;
        return sel && sel.event instanceof Game_CharacterBase ? sel.event : null;
    };

    //-------------------------------------------------------------------------
    // Marker sprites, pooled, inside the tilemap

    /** Bottom of the character's cell in tilemap pixels: the feet, ignoring shiftY and jumps. */
    const footY = ch => Math.round($gameMap.adjustY(ch._realY) * $gameMap.tileHeight() + $gameMap.tileHeight());
    Stance.footY = footY;

    // Vertical offset to place the ellipse center directly at the boots/feet inside the chibi sprite
    const FEET_OFFSET_Y = 12;
    const feetY = (ch, cells = 1) => footY(ch) - FEET_OFFSET_Y * cells;
    Stance.feetY = feetY;
    Stance.FEET_OFFSET_Y = FEET_OFFSET_Y;

    /**
     * Dress and place a selection sprite for this frame: the ring for the character's footprint and the current
     * pulse frame, at its feet (x = screenX, y = feet center), z = its stance ring's z + 1, opacity 255. Any plugin
     * that marks selected units (UF_Select) calls this every frame so every selected unit looks the same.
     */
    Stance.placeSelection = function(sprite, ch, characterSprite) {
        const cells = Stance.cellsOf(characterSprite);
        const b = Stance.selectBitmap(Stance.selectFrame(Graphics.frameCount), cells);
        if (sprite.bitmap !== b) sprite.bitmap = b;
        if (sprite.anchor.x !== 0.5 || sprite.anchor.y !== selectAnchorY) sprite.anchor.set(0.5, selectAnchorY);
        sprite.x = ch.screenX();
        sprite.y = feetY(ch, cells);
        const chZ = (characterSprite && typeof characterSprite.z === "number") ? characterSprite.z : (typeof ch.screenZ === "function" ? ch.screenZ() : (typeof ch.screenY === "function" ? ch.screenY() : 0));
        sprite.z = chZ - 5; // strictly behind creature sprite
        sprite.opacity = 255;
        return sprite;
    };

    class Sprite_UFStanceMarker extends Sprite {
        constructor() {
            super();
            this.anchor.set(0.5, 1); // bottom-center, feet on the square
            this.z = Z;
            this.visible = false;
            this._ufStance = null;
            this._ufCells = 0;
            this._ufCharacter = null;
            this._ufFrame = -1;
        }

        setStance(stance, cells = 1) {
            if (this._ufStance === stance && this._ufCells === cells && this.bitmap) return;
            this._ufStance = stance;
            this._ufCells = cells;
            const b = Stance.bitmap(stance, cells);
            this.bitmap = b;
            this.anchor.set(0.5, ringAnchorY(b.height, cells));
        }

        follow(ch, characterSprite) {
            this.x = ch.screenX();
            this.y = footY(ch);
            const chZ = characterSprite && typeof characterSprite.z === "number" ? characterSprite.z : (typeof ch.screenZ === "function" ? ch.screenZ() : this.y);
            this.z = chZ - 5; // strictly behind creature sprite
            this.opacity = 255;
        }

        get character() {
            return this._ufCharacter;
        }

        get stance() {
            return this._ufStance;
        }

        get cells() {
            return this._ufCells;
        }
    }
    Stance.MarkerSprite = Sprite_UFStanceMarker;

    class StanceMarkers {
        constructor(tilemap) {
            this._tilemap = tilemap;
            this._pool = [];
            this._byCharacter = new Map();
            this._select = null;
            this.stats = { frames: 0, ms: 0, shown: 0 };
        }

        inView(ch) {
            const sx = $gameMap.adjustX(ch._realX), sy = $gameMap.adjustY(ch._realY);
            return sx >= -1 - VIEW_MARGIN && sy >= -1 - VIEW_MARGIN &&
                sx <= $gameMap.screenTileX() + VIEW_MARGIN && sy <= $gameMap.screenTileY() + VIEW_MARGIN;
        }

        /** Once per frame, after the character sprites updated: one visible marker per unit event in view. */
        sync(characterSprites) {
            const t0 = performance.now();
            const frame = Graphics.frameCount;
            let shown = 0;
            if (Stance.showAlliance && Stance.enabled && window.$gameMap) {
                for (const sprite of characterSprites) {
                    const ch = sprite._character;
                    if (!ch) continue;
                    const stance = stanceOfCharacter(ch);
                    if (!stance) continue;
                    // The sprite's own visibility already covers empty images and fog (UF_ColonyOverseer's alias).
                    if (!sprite.visible || ch.isTransparent() || !this.inView(ch)) continue;
                    let m = this._byCharacter.get(ch);
                    if (!m) {
                        m = this.acquire();
                        m._ufCharacter = ch;
                        this._byCharacter.set(ch, m);
                    }
                    m.setStance(stance, Stance.cellsOf(sprite));
                    m.follow(ch, sprite);
                    m.visible = true;
                    m._ufFrame = frame;
                    shown++;
                }
            }
            for (const m of this._pool) if (m.visible && (m._ufFrame !== frame || !Stance.showAlliance)) this.release(m);
            this.syncSelected(characterSprites);
            if (this._select && this._select.visible && typeof this._tilemap._sortChildren === "function") {
                this._tilemap._sortChildren();
            }
            this.stats.frames++;
            this.stats.ms += performance.now() - t0;
            this.stats.shown = shown + (this.selectionMarker() ? 1 : 0);
        }

        /** The selection ring around the selected unit: one sprite, shown while the unit is drawn on this map. */
        syncSelected(characterSprites) {
            const ch = Stance.enabled ? Stance.selectedCharacter() : null;
            const sprite = ch ? characterSprites.find(s => s._character === ch) : null;
            if (!this._select) {
                this._select = new Sprite_UFStanceMarker();
                this._select._ufStance = "selected";
                this._tilemap.addChild(this._select);
            }
            const s = this._select;
            if (!sprite || !sprite.visible || ch.isTransparent() || !this.inView(ch)) {
                s.visible = false;
                s._ufCharacter = null;
                return;
            }
            s._ufCharacter = ch;
            Stance.placeSelection(s, ch, sprite);
            s._ufCells = s.bitmap ? s.bitmap._ufCells : 1;
            s.visible = true;
        }

        selectionMarker() {
            return this._select && this._select.visible ? this._select : null;
        }

        acquire() {
            let m = this._pool.find(s => !s.visible && !s._ufCharacter);
            if (!m) {
                m = new Sprite_UFStanceMarker();
                this._pool.push(m);
                this._tilemap.addChild(m);
            }
            return m;
        }

        release(m) {
            if (m._ufCharacter) this._byCharacter.delete(m._ufCharacter);
            m._ufCharacter = null;
            m.visible = false;
        }

        list() {
            return this._pool.filter(m => m.visible);
        }

        markerOf(ch) {
            const m = this._byCharacter.get(ch);
            return m && m.visible ? m : null;
        }
    }

    const layer = () => {
        const scene = SceneManager._scene;
        return scene && scene._spriteset && scene._spriteset._ufStance ? scene._spriteset._ufStance : null;
    };
    /** The visible marker sprites on the current map. */
    Stance.markers = () => (layer() ? layer().list() : []);
    /** The visible marker of a unit (record or id) or Game_Event, else null. */
    Stance.markerOf = x => {
        const L = layer();
        if (!L || x === null || x === undefined) return null;
        let ev = null;
        if (x instanceof Game_CharacterBase) ev = x;
        else if (typeof x === "number") ev = window.UF.World ? UF.World.eventOf(x) : null;
        else if (typeof x === "object" && typeof x.id === "number") ev = window.UF.World ? UF.World.eventOf(x.id) : null;
        return ev ? L.markerOf(ev) : null;
    };
    /** Per-frame cost of the marker sync on the current map: { frames, ms, shown }. */
    Stance.stats = () => (layer() ? layer().stats : null);
    /** The selection ring sprite while a unit is selected and drawn, else null. */
    Stance.selectionMarker = () => (layer() ? layer().selectionMarker() : null);

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufStance = new StanceMarkers(this._tilemap);
    };

    // After the core update the character sprites hold this frame's positions; markers copy them.
    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        if (this._ufStance) this._ufStance.sync(this._characterSprites);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "stance"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        const colorDist = (a, b) => {
            const A = hexToRgb(a), B = hexToRgb(b);
            return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
        };
        const rgbDist = (A, B) => Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
        const euclid = (a, b) => {
            const A = hexToRgb(a), B = hexToRgb(b);
            return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
        };

        // Reads a marker bitmap and describes its shape: all rows full width, alpha values within allowedAlphas
        function shapeOf(b, allowedAlphas) {
            const w = b.width, h = b.height;
            const d = b.context.getImageData(0, 0, w, h).data;
            const A = (x, y) => d[(y * w + x) * 4 + 3];
            const P = (x, y) => [d[(y * w + x) * 4], d[(y * w + x) * 4 + 1], d[(y * w + x) * 4 + 2], A(x, y)];
            const problems = [];
            const spans = [];
            let badRows = 0;
            for (let y = 0; y < h; y++) {
                let x0 = -1, x1 = -1;
                for (let x = 0; x < w; x++) if (A(x, y) > 0) { if (x0 < 0) x0 = x; x1 = x; }
                spans.push(x0 < 0 ? 0 : x1 - x0 + 1);
                if (x0 < 0 || x0 !== w - 1 - x1) badRows++;
            }
            if (badRows) problems.push(`${badRows} rows empty or not symmetric`);
            if (spans[0] !== w || spans[h - 1] !== w) problems.push(`top/bottom rows ${spans[0]}/${spans[h - 1]} not full width ${w}`);
            const alphas = new Set();
            for (let i = 3; i < d.length; i += 4) alphas.add(d[i]);
            const stray = [...alphas].filter(a => !allowedAlphas.includes(a));
            if (stray.length) problems.push(`alpha values outside {${allowedAlphas.join(",")}}: ${stray.slice(0, 6).join(",")}`);
            return { w, h, A, P, problems, spans, alphas: [...alphas].sort((a, b) => a - b) };
        }
        // Screen pixels that differ between two snaps inside a box [x, y, w, h] (clipped to the screen).
        const changedIn = (on, off, box) => {
            const xa = Math.max(0, box[0]), ya = Math.max(0, box[1]);
            const xb = Math.min(on.width, box[0] + box[2]), yb = Math.min(on.height, box[1] + box[3]);
            if (xb <= xa || yb <= ya) return { n: 0, of: 0 };
            const a = on.context.getImageData(xa, ya, xb - xa, yb - ya).data, b = off.context.getImageData(xa, ya, xb - xa, yb - ya).data;
            let n = 0;
            for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
            return { n, of: (xb - xa) * (yb - ya) };
        };

        UF.Test.suite("stance", async t => {
            const W = UF.World, F = UF.Factions;
            const area = W && W.currentArea();
            t.check("world_ready", !!area && !!F && !!SceneManager._scene._spriteset._ufStance,
                area ? `area (${area.x},${area.y}), factions ${F ? "loaded" : "MISSING"}, marker layer ${SceneManager._scene._spriteset._ufStance ? "created" : "MISSING"}` : "not on an area map");
            if (!area || !F) return;
            const spriteset = SceneManager._scene._spriteset, tilemap = spriteset._tilemap;
            const mid = Math.floor(W.state.size / 2);

            t.check("catalog_colors", !!catalog() && STANCES.every(s => /^#[0-9a-f]{6}$/i.test(colorOf(s))) && alphaOf() > 0 && alphaOf() < 1,
                `catalog.stance ${catalog() ? "present" : "MISSING (defaults in use)"}: ${STANCES.map(s => `${s} ${colorOf(s)}`).join(", ")}, alpha ${alphaOf()}`);
            const sizeLine = [];
            let bmpsOk = true;
            for (const c of [1, 2]) {
                const want = ringSize(c), wantSel = selectRingSize(c);
                const ok = STANCES.every(s => {
                    const b = Stance.bitmap(s, c);
                    return b && b.width === want.w && b.height === want.h && b._ufName === BITMAP_NAMES[s] && b._ufCells === c && b.smooth === false && Stance.bitmap(s, c) === b;
                }) && [0, 1, 2].every(f => {
                    const b = Stance.selectBitmap(f, c);
                    return b && b.width === wantSel.w && b.height === wantSel.h && b._ufName === SELECT_NAME && b._ufFrame === f && b.smooth === false && Stance.selectBitmap(f, c) === b;
                });
                if (!ok) bmpsOk = false;
                sizeLine.push(`${c} square${c > 1 ? "s" : ""}: stance ${STANCES.map(s => `${Stance.bitmap(s, c).width}x${Stance.bitmap(s, c).height}`).join("/")} (want ${want.w}x${want.h}), ` +
                    `selection ${[0, 1, 2].map(f => `${Stance.selectBitmap(f, c).width}x${Stance.selectBitmap(f, c).height}`).join("/")} (want ${wantSel.w}x${wantSel.h})`);
            }
            t.check("bitmaps_generated", bmpsOk, `${sizeLine.join("; ")}; named ${BITMAP_NAMES.friendly}.. and ${SELECT_NAME}, nearest-neighbour scaling, cached on repeat`);

            // The shapes: rings, not squares (VISION V32 revised 2026-09-19 14:40), sampled pixel by pixel.
            const shapeLines = [];
            let shapesOk = true;
            const fillA = Math.round(alphaOf() * 255), rimA = Math.round(Math.min(1, alphaOf() + OUTLINE_EXTRA_ALPHA) * 255);
            for (const c of [1, 2]) {
                for (const s of STANCES) {
                    const sh = shapeOf(Stance.bitmap(s, c), [0, fillA, rimA]);
                    const fillRgb = hexToRgb(colorOf(s)), rimRgb = darken(fillRgb, OUTLINE_DARKEN);
                    // Every opaque pixel touching the outside is rim; the middle is fill; colors within 8 per channel.
                    let edgeBad = 0, colorBad = 0;
                    for (let y = 0; y < sh.h; y++) {
                        for (let x = 0; x < sh.w; x++) {
                            const p = sh.P(x, y);
                            if (!p[3]) continue;
                            const out = x === 0 || y === 0 || x === sh.w - 1 || y === sh.h - 1 || !sh.A(x - 1, y) || !sh.A(x + 1, y) || !sh.A(x, y - 1) || !sh.A(x, y + 1);
                            if (out && p[3] !== rimA) edgeBad++;
                            if (rgbDist(p, p[3] === rimA ? rimRgb : fillRgb) > 8) colorBad++;
                        }
                    }
                    const middle = sh.P(sh.w >> 1, sh.h >> 1);
                    if (edgeBad) sh.problems.push(`${edgeBad} edge px not rim`);
                    if (colorBad) sh.problems.push(`${colorBad} px off the catalog colors`);
                    if (!(middle[3] === fillA && rgbDist(middle, fillRgb) <= 8)) sh.problems.push(`middle px alpha ${middle[3]} rgb ${middle.slice(0, 3)} (want fill ${fillA})`);
                    if (sh.problems.length) shapesOk = false;
                    if (s === "hostile" || sh.problems.length) shapeLines.push(`${s} ${sh.w}x${sh.h}: top row ${sh.spans[0]} px, middle row ${sh.spans[sh.h >> 1]} px, alphas ${sh.alphas.join("/")}${sh.problems.length ? ` PROBLEMS: ${sh.problems.join("; ")}` : ""}`);
                }
                Stance.enableGlow = true;
                Stance.enablePulse = true;
                const bands = [];
                for (const f of [0, 1, 2]) {
                    const b = Stance.selectBitmap(f, c);
                    const w = b.width, h = b.height;
                    const d = b.context.getImageData(0, 0, w, h).data;
                    const A = (x, y) => d[(y * w + x) * 4 + 3];
                    const P = (x, y) => [d[(y * w + x) * 4], d[(y * w + x) * 4 + 1], d[(y * w + x) * 4 + 2], A(x, y)];
                    const midA = A(w >> 1, h >> 1);
                    const cornerA = A(0, 0);
                    const band = P(w >> 1, 2);
                    const problems = [];
                    if (midA !== 0) problems.push(`middle alpha ${midA} (want 0: open ring)`);
                    if (cornerA !== 0) problems.push(`corner alpha ${cornerA} (want 0: ellipse corners)`);
                    if (!(band[3] >= 180 && band[1] > band[0] && band[1] > band[2])) problems.push(`band ${band} (want glowing green)`);
                    if (problems.length) shapesOk = false;
                    bands.push(band[1]);
                    if (f === 1 || problems.length) shapeLines.push(`selection frame ${f} ${w}x${h}: green ${band[1]} alpha ${band[3]}${problems.length ? ` PROBLEMS: ${problems.join("; ")}` : ""}`);
                }
                if (!(bands[0] < bands[1] && bands[1] < bands[2])) {
                    shapesOk = false;
                    shapeLines.push(`selection frames at ${c} squares: band green pulse ${bands.join(" -> ")} (want rising)`);
                } else if (c === 1) shapeLines.push(`selection pulse bands ${bands.join(" -> ")}`);
                Stance.enableGlow = false;
                Stance.enablePulse = false;
            }
            t.check("ring_shape", shapesOk, shapeLines.join("; "));

            // Three factions with known relations: allied, neutral, at war.
            const others = F.all().filter(f => !f.isPlayer);
            t.check("three_factions", others.length >= 3, `${others.length} non-player factions: ${others.map(f => f.id).join(", ")}`);
            if (others.length < 3) return;
            const [fa, fb, fc] = others;
            const savedRel = [fa, fb, fc].map(f => F.relation("player", f.id));
            F.setRelation("player", fa.id, 80, "stance check: allied");
            F.setRelation("player", fb.id, 0, "stance check: neutral");
            F.setRelation("player", fc.id, -80, "stance check: at war");

            // Test units in the start clearing (radius 3 around the middle; the pair stand at mid±1 on the middle row).
            // The wolf is a stock 48 px cut, the big one a stock 96 px monster sheet (troll-sized, V44), put in the
            // clearing's corner so its tall sprite covers nobody whose ring is sampled below.
            const add = (name, image, x, y, data) => W.addUnit({ name, image: { characterName: image }, area, x, y, dir: 2, data });
            const units = {
                colonist: add("TEST_colonist", "$U7_Ranger", mid, mid + 3, { kind: "colonist", faction: "player" }),
                monster: add("TEST_monster", "$U7_Troll", mid - 1, mid + 2, { kind: "creature", species: "troll", tags: ["monster"], faction: null }),
                grazer: add("TEST_grazer", "$U7_Hare", mid + 1, mid + 2, { kind: "creature", species: "hare", tags: ["grazer"], faction: null }),
                allied: add("TEST_allied", "$U7_Townsman", mid - 2, mid - 2, { kind: "person", faction: fa.id, species: fa.species }),
                neutral: add("TEST_neutral", "$U7_Guard", mid - 2, mid + 2, { kind: "person", faction: fb.id, species: fb.species, tags: ["guard"] }),
                war: add("TEST_war", "$U7_Goblin", mid + 2, mid + 2, { kind: "person", faction: fc.id, species: fc.species, tags: ["soldier"] }),
                wolf: add("TEST_wolf", "$UF_Stock_Nature_0", mid + 1, mid + 3, { kind: "creature", species: "wolf", tags: [], faction: null }),
                big: add("TEST_big", "$UF_Stock_BigMonster1_r1", mid + 3, mid + 3, { kind: "creature", species: "troll", tags: ["monster"], faction: null })
            };
            const expect = { colonist: "friendly", monster: "hostile", grazer: "indifferent", allied: "friendly", neutral: "indifferent", war: "hostile", wolf: "indifferent", big: "hostile" };
            const got = {};
            for (const k of Object.keys(units)) got[k] = Stance.of(units[k]);
            const wrong = Object.keys(expect).filter(k => got[k] !== expect[k]);
            const pairEvents = [1, 2].map(id => $gameMap.event(id)).filter(ev => ev && isColonistEvent(ev));
            const pairStances = pairEvents.map(ev => Stance.of(ev));
            t.check("of_kinds", wrong.length === 0 && pairStances.every(s => s === "friendly"),
                `${Object.keys(expect).map(k => `${k} -> ${got[k]}`).join(", ")}; start pair events (${pairEvents.length}): ${pairStances.join(", ") || "none (UF_Colonists installed?)"}` +
                `${wrong.length ? `; WRONG: ${wrong.map(k => `${k} expected ${expect[k]}`).join(", ")}` : ""}`);

            // The tiers between: "friendly" (15..49) counts as friendly, "hostile" (-49..-15) as hostile.
            F.setRelation("player", fa.id, 20, "stance check: friendly tier");
            F.setRelation("player", fb.id, -30, "stance check: hostile tier");
            const tierA = Stance.of(units.allied), tierB = Stance.of(units.neutral);
            F.setRelation("player", fa.id, 80, "stance check: allied");
            F.setRelation("player", fb.id, 0, "stance check: neutral");
            t.check("of_tiers", tierA === "friendly" && tierB === "hostile", `relation +20 (${F.tierOf(20).id}) -> ${tierA}; relation -30 (${F.tierOf(-30).id}) -> ${tierB}`);

            const byId = Stance.of(units.war.id), byEvent = Stance.of(W.eventOf(units.war.id)), tree = Stance.of($gamePlayer);
            t.check("of_accepts_id_and_event", byId === "hostile" && byEvent === "hostile" && tree === null && Stance.describe(units.war) === "Hostile",
                `by id ${byId}, by event ${byEvent}, the player (not a unit) ${tree}, describe() "${Stance.describe(units.war)}"`);

            // Look at the start up close; every test unit is within 3 cells.
            $gamePlayer.locate(mid, mid);
            const zoomLevel = UF.Camera ? UF.Camera.level() : 0;
            if (UF.Camera) UF.Camera.setLevel(0);
            Stance.showAlliance = true;
            await t.waitFrames(12);

            const charSpriteOf = ev => spriteset._characterSprites.find(s => s._character === ev);
            // Sprite positions are set in Spriteset_Map.update, which RMMZ runs before $gameMap.update moves the
            // characters, so between frames a marker is compared with the character's drawn sprite (same frame),
            // not with the character object (a step further on when it walks). The old selection_square check
            // compared with the character object and failed whenever the selected colonist was walking.
            const drawnFeet = (e, s) => ({ x: s.x, y: s.y + e.shiftY() + e.jumpHeight() });
            const drawnSelectionFeet = (e, s, cells = 1) => ({ x: s.x, y: s.y + e.shiftY() + e.jumpHeight() - FEET_OFFSET_Y * cells });
            // The ring's pixel box in the tilemap (inclusive rows and columns), from its anchor and bitmap.
            const boxOf = mk => {
                const b = mk.bitmap, left = mk.x - mk.anchor.x * b.width, top = mk.y - mk.anchor.y * b.height;
                return { left, top, right: left + b.width - 1, bottom: top + b.height - 1, cx: left + b.width / 2, cy: top + b.height / 2 };
            };
            const mev = W.eventOf(units.monster.id);
            const m = Stance.markerOf(units.monster.id);
            const cs = charSpriteOf(mev);
            const bmp = m && m.bitmap;
            const want = colorOf("hostile"), wantA = Math.round(alphaOf() * 255);
            const cx = bmp ? bmp.width >> 1 : 0, cy = bmp ? bmp.height >> 1 : 0;
            const center = bmp ? bmp.getPixel(cx, cy) : "none", centerA = bmp ? bmp.getAlphaPixel(cx, cy) : -1;
            const edgeA = bmp ? bmp.getAlphaPixel(0, cy) : -1;
            const order = m && cs ? `${tilemap.children.indexOf(m)} < ${tilemap.children.indexOf(cs)}` : "n/a";
            const mFeet = mev && cs ? drawnFeet(mev, cs) : null;
            // Under the character, above flat objects on its cell (grass at foot row - 100): foot row - 50.
            const under = !!m && !!cs && (m.z === markerZ(m.y) || m.z === cs.z - 5) && m.z < cs.z && m.z > m.y - 100 && tilemap.children.indexOf(m) < tilemap.children.indexOf(cs);
            const atFeet = !!m && !!mFeet && m.x === mFeet.x && m.y === mFeet.y;
            t.check("marker_drawn", !!m && m.visible && m.parent === tilemap && under && atFeet && colorDist(center, want) <= 8 && Math.abs(centerA - wantA) <= 4 && edgeA > centerA,
                m ? `monster marker in the tilemap at (${m.x},${m.y}) vs drawn feet (${mFeet ? mFeet.x : "?"},${mFeet ? mFeet.y : "?"}), z ${m.z} vs character z ${cs ? cs.z : "?"} (child order ${order}); ` +
                    `bitmap ${bmp ? `${bmp._ufName} ${bmp.width}x${bmp.height}` : "none"} middle ${center} alpha ${centerA} (want ${want} / ${wantA}), rim alpha ${edgeA}`
                    : `no marker for the monster unit (${Stance.markers().length} markers visible)`);

            // Sized to the footprint (V44): a 48 px creature's ring is 40x20, a 96 px one's 80x40; both with the bottom
            // row on the cell's last row, centred on the feet. The selection ring is 4x2 px larger per square, same centre.
            const bev = W.eventOf(units.big.id), bcs = bev && charSpriteOf(bev), bm = Stance.markerOf(units.big.id);
            const sizeOk = (mk, cells) => {
                if (!mk) return false;
                const wantSize = ringSize(cells), box = boxOf(mk);
                return mk.bitmap.width === wantSize.w && mk.bitmap.height === wantSize.h && mk.cells === cells && box.bottom === mk.y - 1 && box.cx === mk.x && box.cy === mk.y - CENTER_ABOVE * cells;
            };
            const boxLine = (label, mk) => {
                if (!mk) return `${label}: no marker`;
                const box = boxOf(mk);
                return `${label} ${mk.bitmap.width}x${mk.bitmap.height} (${mk.cells} sq), rows ${box.top}..${box.bottom} vs foot row ${mk.y}, centre (${box.cx},${box.cy})`;
            };
            Stance.setSelected(units.big.id);
            await t.waitFrames(2);
            const bigSel = Stance.selectionMarker(), bm2 = Stance.markerOf(units.big.id);
            const bigSelOk = !!bigSel && !!bm2 && bigSel.bitmap.width === selectRingSize(2).w && bigSel.bitmap.height === selectRingSize(2).h &&
                boxOf(bigSel).cx === boxOf(bm2).cx;
            const bigSelLine = bigSel ? `${bigSel.bitmap.width}x${bigSel.bitmap.height}, centre (${boxOf(bigSel).cx},${boxOf(bigSel).cy}) vs its stance ring (${bm2 ? boxOf(bm2).cx : "?"},${bm2 ? boxOf(bm2).cy : "?"})` : "none";
            Stance.setSelected(null);
            t.check("ring_sizes", sizeOk(m, 1) && sizeOk(bm, 2) && bigSelOk && Stance.cellsOf(bcs) === 2 && Stance.cellsOf(cs) === 1,
                `${boxLine("monster (48 px sheet)", m)}; ${boxLine("big (96 px sheet)", bm)}; big selected: ${bigSelLine}; ` +
                `cellsOf: monster ${Stance.cellsOf(cs)}, big ${Stance.cellsOf(bcs)} (frame widths ${cs ? cs._frame.width : "?"} / ${bcs ? bcs._frame.width : "?"})`);

            // The targeted unit: a glowing green ring at its feet, above the ground, below the sprite, open in the
            // middle, pulsing through its three frames at full opacity. Unselected units have no indicators.
            Stance.showAlliance = false;
            Stance.enableGlow = true;
            Stance.enablePulse = true;
            const cev = W.eventOf(units.colonist.id);
            Stance.setSelected(units.colonist.id);
            await t.waitFrames(3);
            const sel = Stance.selectionMarker();
            const selCs = charSpriteOf(cev);
            const selBmp = sel && sel.bitmap;
            const selFeet = cev && selCs ? drawnSelectionFeet(cev, selCs, 1) : null;
            const sw = selBmp ? selBmp.width : 0, shh = selBmp ? selBmp.height : 0;
            const midA = selBmp ? selBmp.getAlphaPixel(sw >> 1, shh >> 1) : -1, cornerA = selBmp ? selBmp.getAlphaPixel(0, 0) : -1;
            const bandPx = selBmp ? selBmp.getPixel(sw >> 1, 2) : "none", bandA = selBmp ? selBmp.getAlphaPixel(sw >> 1, 2) : -1;
            const bRgb = hexToRgb(bandPx);
            const isGreen = bRgb[1] > bRgb[0] && bRgb[1] > bRgb[2];
            const lookOk = !!selBmp && selBmp._ufName === SELECT_NAME && sw === SELECT_RING.w && shh === SELECT_RING.h && midA === 0 && cornerA === 0 && bandA >= 220 && isGreen;
            const placedOk = !!sel && sel.visible && sel.parent === tilemap && !!selFeet && sel.x === selFeet.x && sel.y === selFeet.y && !!selCs && sel.z < selCs.z;
            const placedLine = sel ? `ring at (${sel.x},${sel.y}) vs drawn feet (${selFeet ? selFeet.x : "?"},${selFeet ? selFeet.y : "?"}); z ${sel.z} vs sprite ${selCs ? selCs.z : "?"}` : "";
            const framesSeen = new Set(), opacities = new Set();
            let placeBad = 0;
            for (let i = 0; i < PULSE_FRAMES + 2; i++) {
                const s = Stance.selectionMarker(), cs2 = charSpriteOf(cev);
                if (s && s.bitmap) framesSeen.add(s.bitmap._ufFrame);
                if (s) opacities.add(s.opacity);
                const feet = cs2 ? drawnSelectionFeet(cev, cs2, 1) : null;
                if (!s || !feet || s.x !== feet.x || s.y !== feet.y) placeBad++;
                await t.waitFrames(1);
            }
            t.check("selection_ring", placedOk && lookOk && framesSeen.size === 3 && opacities.size === 1 && opacities.has(255) && placeBad === 0,
                sel ? `${placedLine}; bitmap ${selBmp ? `${selBmp._ufName} ${sw}x${shh}` : "none"} (want ${SELECT_RING.w}x${SELECT_RING.h}): middle alpha ${midA} (want 0), corner alpha ${cornerA} (want 0), band ${bandPx} (green ${isGreen}) alpha ${bandA} (want >= 220); ` +
                    `over ${PULSE_FRAMES + 2} frames: pulse frames shown {${[...framesSeen].sort().join(",")}} (want 0,1,2), opacity {${[...opacities].join(",")}} (want 255), ${placeBad} frames off the drawn feet`
                    : "no selection marker drawn");
            await t.waitFrames(2);
            t.screenshot("selection_ring");
            Stance.setSelected(null);
            Stance.enableGlow = false;
            Stance.enablePulse = false;
            await t.waitFrames(2);
            t.check("selection_clears", !Stance.selectionMarker(), `after setSelected(null): marker ${Stance.selectionMarker() ? "still visible" : "hidden"}`);

            Stance.showAlliance = true;
            await t.waitFrames(2);
            const stances = Stance.markers().map(s => s.stance);
            const count = s => stances.filter(v => v === s).length;
            t.check("markers_per_unit", Object.values(units).every(u => Stance.markerOf(u)) && count("friendly") >= 2 + pairEvents.length && count("hostile") >= 3 && count("indifferent") >= 3,
                `${Stance.markers().length} markers visible: ${count("friendly")} friendly, ${count("indifferent")} indifferent, ${count("hostile")} hostile (want >= ${2 + pairEvents.length} / 3 / 3)`);

            // Really rendered, as square: screen pixels inside the neutral person's square (its left and right ends and
            // its front) change when markers are switched off and move toward the stance color when they're on;
            // points outside the 48x48 square bounds stay as they were.
            const nev = W.eventOf(units.neutral.id);
            const nm = Stance.markerOf(units.neutral.id);
            const zoom = UF.Camera ? UF.Camera.zoom() : 1;
            const wantN = colorOf("indifferent");
            if (nm) {
                const g = nm.getGlobalPosition();
                const at = (dx, dy) => [Math.round(g.x + dx * zoom), Math.round(g.y + dy * zoom)];
                const inRing = [at(-17, -10), at(16, -10), at(-11, -3), at(10, -3)];
                const outsideSquare = [at(-28, -24), at(28, -24), at(0, 5), at(0, -52)];
                const on = SceneManager.snap();
                Stance.setEnabled(false);
                await t.waitFrames(2);
                const off = SceneManager.snap();
                const hiddenAll = Stance.markers().length === 0;
                Stance.setEnabled(true);
                await t.waitFrames(2);
                const ringPts = inRing.map(([x, y]) => {
                    const p1 = on.getPixel(x, y), p2 = off.getPixel(x, y);
                    return { x, y, p1, p2, ok: p1 !== p2 && euclid(p1, wantN) < euclid(p2, wantN) };
                });
                const outPts = outsideSquare.map(([x, y]) => ({ x, y, p1: on.getPixel(x, y), p2: off.getPixel(x, y) }));
                const outsideSame = outPts.filter(c => c.p1 === c.p2).length;
                t.check("marker_rendered", hiddenAll && ringPts.filter(c => c.ok).length >= 2 && outsideSame >= 3,
                    `inside the neutral square, markers on -> off: ${ringPts.map(c => `(${c.x},${c.y}) ${c.p1} -> ${c.p2}${c.ok ? " toward " + wantN : ""}`).join("; ")} (want >= 2 toward); ` +
                    `outside square: ${outPts.map(c => `(${c.x},${c.y}) ${c.p1 === c.p2 ? "same" : `${c.p1} -> ${c.p2}`}`).join("; ")} (want >= 3 same); ` +
                    `${hiddenAll ? "all markers hidden while disabled" : "markers still visible while disabled"}; screen tone ${JSON.stringify($gameScreen.tone())}`);
            } else {
                t.check("marker_rendered", false, "no marker for the neutral person to sample");
            }
            t.screenshot("stance_markers");

            // The rings at the three zoom levels with the colonist selected: colonists, the wolf and the 96 px monster.
            // Rendered at every zoom: pixels in each ring's screen box change when markers are switched off.
            if (UF.Camera) {
                Stance.setSelected(units.colonist.id);
                $gamePlayer.locate(mid, mid + 2);
                const zoomLines = [];
                let zoomOk = true;
                const names = ["1", "23", "13"];
                for (let i = 0; i < Math.min(3, UF.Camera.levels.length); i++) {
                    UF.Camera.setLevel(i);
                    await t.waitFrames(6);
                    const z = UF.Camera.zoom();
                    const boxes = [["colonist", units.colonist], ["wolf", units.wolf], ["big", units.big]].map(([label, u]) => {
                        const mk = Stance.markerOf(u.id);
                        if (!mk) return { label, box: null };
                        const g = mk.getGlobalPosition(), b = mk.bitmap;
                        return { label, box: [Math.floor(g.x - mk.anchor.x * b.width * z), Math.floor(g.y - mk.anchor.y * b.height * z), Math.ceil(b.width * z), Math.ceil(b.height * z)] };
                    });
                    const on = SceneManager.snap();
                    t.screenshot(`rings_zoom_${names[i]}`);
                    Stance.setEnabled(false);
                    await t.waitFrames(2);
                    const off = SceneManager.snap();
                    Stance.setEnabled(true);
                    await t.waitFrames(2);
                    const counts = boxes.map(({ label, box }) => (box ? Object.assign({ label }, changedIn(on, off, box)) : { label, n: -1 }));
                    if (!counts.every(c => c.n > 0)) zoomOk = false;
                    zoomLines.push(`zoom ${z.toFixed(3)}: ${counts.map(c => (c.n < 0 ? `${c.label} no marker` : `${c.label} ${c.n}/${c.of} px changed`)).join(", ")}`);
                }
                UF.Camera.setLevel(0);
                $gamePlayer.locate(mid, mid);
                Stance.setSelected(null);
                await t.waitFrames(4);
                t.check("rendered_all_zooms", zoomOk, zoomLines.join("; "));
            }

            // Follows the character every frame, mid-step included (compared with the drawn sprite, see drawnFeet).
            const walker = units.allied;
            W.sendUnit(walker.id, { area, x: mid + 2, y: mid - 2 });
            let midSamples = 0, midMatches = 0, worstLag = 0;
            await t.waitUntil(() => {
                const e = W.eventOf(walker.id), mk = Stance.markerOf(walker.id), s = e && charSpriteOf(e);
                if (e && s && e.isMoving()) {
                    midSamples++;
                    const feet = drawnFeet(e, s);
                    if (mk && mk.x === feet.x && mk.y === feet.y) midMatches++;
                    else if (mk) worstLag = Math.max(worstLag, Math.abs(mk.x - feet.x), Math.abs(mk.y - feet.y));
                }
                return !walker.goal;
            }, 15000, "the allied walker to arrive").catch(() => {});
            await t.waitFrames(2);
            const wev = W.eventOf(walker.id), wm = Stance.markerOf(walker.id), ws = wev && charSpriteOf(wev);
            const wfeet = wev && ws ? drawnFeet(wev, ws) : null;
            t.check("marker_follows", !walker.goal && !!wev && wev.x === mid + 2 && !!wm && !!wfeet && wm.x === wfeet.x && wm.y === wfeet.y && wm.x === wev.screenX() && wm.y === footY(wev) && midSamples > 0 && (midMatches === midSamples || worstLag <= 1),
                `walker at (${wev ? wev.x : "?"},${wev ? wev.y : "?"}) (goal ${walker.goal ? "still set" : "reached"}); marker at (${wm ? wm.x : "none"},${wm ? wm.y : ""}) vs drawn feet (${wfeet ? wfeet.x : "?"},${wfeet ? wfeet.y : "?"}) and cell feet (${wev ? wev.screenX() : "?"},${wev ? footY(wev) : "?"}); ` +
                `${midMatches} of ${midSamples} mid-step frames matched the drawn sprite${worstLag ? `, worst lag ${worstLag} px` : ""}`);

            // Hidden while transparent, gone when out of view, gone when the unit leaves the map.
            nev.setTransparent(true);
            await t.waitFrames(2);
            const hiddenT = !Stance.markerOf(units.neutral.id);
            nev.setTransparent(false);
            await t.waitFrames(2);
            const backT = !!Stance.markerOf(units.neutral.id);
            t.check("hidden_transparent", hiddenT && backT, `transparent: marker ${hiddenT ? "hidden" : "STILL SHOWN"}; opaque again: marker ${backT ? "back" : "MISSING"}`);

            nev.locate(5, 5);
            await t.waitFrames(2);
            const hiddenV = !Stance.markerOf(units.neutral.id);
            nev.locate(mid - 2, mid + 2);
            await t.waitFrames(2);
            const backV = !!Stance.markerOf(units.neutral.id);
            t.check("hidden_out_of_view", hiddenV && backV, `at (5,5), off screen: marker ${hiddenV ? "gone" : "STILL SHOWN"}; back in view: marker ${backV ? "back" : "MISSING"}`);

            const gev = W.eventOf(units.grazer.id);
            const before = Stance.markers().length;
            W.removeUnit(units.grazer.id);
            await t.waitFrames(2);
            const after = Stance.markers().length;
            const stale = Stance.markers().some(s => s.character === gev);
            t.check("hidden_off_map", !!gev && !W.eventOf(units.grazer.id) && !stale && !Stance.markerOf(units.grazer.id),
                `grazer removed: event ${W.eventOf(units.grazer.id) ? "still on the map" : "gone"}, markers ${before} -> ${after}${stale ? ", its marker is still visible" : ""}`);

            // Cost: the sync over 120 frames.
            const s0 = Object.assign({}, Stance.stats());
            await t.waitFrames(120);
            const s1 = Stance.stats();
            const frames = s1.frames - s0.frames, avg = frames > 0 ? (s1.ms - s0.ms) / frames : Infinity;
            // User directive 2026-09-22: remove green squares entirely, no indicator of alliance under creatures when unselected
            Stance.showAlliance = false;
            await t.waitFrames(3);
            const unselectedMarkers = Stance.markers().length;
            t.check("unselected_no_indicators", unselectedMarkers === 0,
                `unselected units have no alliance indicators: ${unselectedMarkers} markers shown (want 0)`);

            // Clean up: test units, relations, zoom.
            Stance.showAlliance = false;
            for (const u of Object.values(units)) W.removeUnit(u.id);
            [fa, fb, fc].forEach((f, i) => F.setRelation("player", f.id, savedRel[i], "stance check: restore"));
            if (UF.Camera) UF.Camera.setLevel(zoomLevel);
            await t.waitFrames(5);
            const leftover = Object.values(units).filter(u => Stance.markerOf(u.id)).length;
            t.check("cleanup", leftover === 0 && [fa, fb, fc].every((f, i) => F.relation("player", f.id) === savedRel[i]), `${leftover} test markers left; relations restored to ${savedRel.join(", ")}`);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during stance checks");
        });
    }
})();
