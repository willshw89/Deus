//=============================================================================
// UF_Stance.js - A colored square under every unit's feet: friendly, indifferent, hostile
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Stance] A colored square under every unit in view: green = friendly, yellow = indifferent, red = hostile (colors from the world catalog).
 * @author UF project
 * @base UF_World
 * @orderAfter UF_Factions
 * @orderAfter UF_ColonyOverseer
 *
 * @help
 * The stance of a unit toward your colony (user decision 2026-09-18: colored
 * squares under units by stance):
 *   friendly     your colonists, anything of faction "player", and members
 *                of factions that are allied or friendly with your colony
 *   indifferent  wildlife, and members of neutral factions
 *   hostile      monsters, and members of factions that are hostile to or
 *                at war with your colony
 *
 * Markers are 48x48 squares drawn in code (UF_GenStance_friendly,
 * UF_GenStance_indifferent, UF_GenStance_hostile: a filled square at the
 * catalog's alpha with a 2 px darker outline), placed inside the map's
 * tilemap at z 5 (above the ground layers, under every character), one per
 * unit event in view, following the character every frame. A marker goes
 * away when its unit leaves the view or the map, or is transparent. The
 * pair's start events (note contains "<colonist", before UF_Colonists) get a
 * friendly marker too.
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

    const SIZE = 48;
    // WORLD_ARCHITECTURE §4: ground layers z 0 and 4, stance markers z 5, designations z 6,
    // characters z = foot pixel row (UF_Perspective25D), which is >= 48 for anything in view.
    const Z = 5;
    const STANCES = ["friendly", "indifferent", "hostile"];
    const BITMAP_NAMES = { friendly: "UF_GenStance_friendly", indifferent: "UF_GenStance_indifferent", hostile: "UF_GenStance_hostile" };
    const LABELS = { friendly: "Friendly", indifferent: "Indifferent", hostile: "Hostile" };
    const DEFAULTS = { colors: { friendly: "#22c55e", indifferent: "#eab308", hostile: "#ef4444" }, alpha: 0.45 };
    const OUTLINE = 2;           // px
    const OUTLINE_DARKEN = 0.55; // outline color = fill color x this
    const OUTLINE_EXTRA_ALPHA = 0.4; // the outline is more opaque than the fill so the square reads at zoom 1/3
    const VIEW_MARGIN = 1;       // cells beyond the screen edge that still get a marker

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
    const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    const darken = (rgb, f) => rgb.map(v => Math.round(v * f));

    //-------------------------------------------------------------------------
    // The public object

    const Stance = {
        STANCES,
        Z,
        SIZE,
        bitmapNames: BITMAP_NAMES,
        /** false hides every marker (development toggle; not saved). */
        enabled: true
    };
    window.UF = window.UF || {};
    window.UF.Stance = Stance;

    //-------------------------------------------------------------------------
    // Rules (WORLD_ARCHITECTURE §5.9)

    function stanceOfUnit(u) {
        const d = (u && u.data) || {};
        if (d.kind === "colonist" || d.faction === "player") return "friendly";
        if (d.faction) {
            const F = window.UF.Factions;
            const tier = F && F.tierBetween ? F.tierBetween("player", d.faction).id : "neutral";
            if (tier === "allied" || tier === "friendly") return "friendly";
            return tier === "neutral" ? "indifferent" : "hostile";
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
    // Generated bitmaps: UF_GenStance_<stance>, 48x48, rebuilt if the catalog colors change

    const bitmaps = {};
    Stance.bitmap = function(stance) {
        if (!STANCES.includes(stance)) return null;
        const color = colorOf(stance), a = alphaOf();
        const cached = bitmaps[stance];
        if (cached && cached._ufColor === color && cached._ufAlpha === a) return cached;
        const rgb = hexToRgb(color);
        const b = new Bitmap(SIZE, SIZE);
        // Outline first, then a cleared inner square filled at the catalog alpha, so the two never blend.
        b.fillRect(0, 0, SIZE, SIZE, rgba(darken(rgb, OUTLINE_DARKEN), Math.min(1, a + OUTLINE_EXTRA_ALPHA)));
        b.clearRect(OUTLINE, OUTLINE, SIZE - 2 * OUTLINE, SIZE - 2 * OUTLINE);
        b.fillRect(OUTLINE, OUTLINE, SIZE - 2 * OUTLINE, SIZE - 2 * OUTLINE, rgba(rgb, a));
        b._ufName = BITMAP_NAMES[stance];
        b._ufColor = color;
        b._ufAlpha = a;
        bitmaps[stance] = b;
        return b;
    };

    //-------------------------------------------------------------------------
    // Marker sprites, pooled, inside the tilemap

    /** Bottom of the character's cell in tilemap pixels: the feet, ignoring shiftY and jumps. */
    const footY = ch => Math.round($gameMap.adjustY(ch._realY) * $gameMap.tileHeight() + $gameMap.tileHeight());
    Stance.footY = footY;

    class Sprite_UFStanceMarker extends Sprite {
        constructor() {
            super();
            this.anchor.set(0.5, 1); // bottom-center, like characters (WORLD_ARCHITECTURE §4)
            this.z = Z;
            this.visible = false;
            this._ufStance = null;
            this._ufCharacter = null;
            this._ufFrame = -1;
        }

        setStance(stance) {
            if (this._ufStance === stance && this.bitmap) return;
            this._ufStance = stance;
            this.bitmap = Stance.bitmap(stance);
        }

        follow(ch) {
            this.x = ch.screenX();
            this.y = footY(ch);
        }

        get stance() {
            return this._ufStance;
        }

        get character() {
            return this._ufCharacter;
        }
    }
    Stance.MarkerSprite = Sprite_UFStanceMarker;

    class StanceMarkers {
        constructor(tilemap) {
            this._tilemap = tilemap;
            this._pool = [];
            this._byCharacter = new Map();
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
            if (Stance.enabled && window.$gameMap) {
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
                    m.setStance(stance);
                    m.follow(ch);
                    m.visible = true;
                    m._ufFrame = frame;
                    shown++;
                }
            }
            for (const m of this._pool) if (m.visible && m._ufFrame !== frame) this.release(m);
            this.stats.frames++;
            this.stats.ms += performance.now() - t0;
            this.stats.shown = shown;
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
        const euclid = (a, b) => {
            const A = hexToRgb(a), B = hexToRgb(b);
            return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
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
            const bmpsOk = STANCES.every(s => {
                const b = Stance.bitmap(s);
                return b && b.width === SIZE && b.height === SIZE && b._ufName === BITMAP_NAMES[s] && Stance.bitmap(s) === b;
            });
            t.check("bitmaps_generated", bmpsOk, `${STANCES.map(s => `${BITMAP_NAMES[s]} ${Stance.bitmap(s).width}x${Stance.bitmap(s).height}`).join(", ")}; cached on repeat`);

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
            const add = (name, image, x, y, data) => W.addUnit({ name, image: { characterName: image }, area, x, y, dir: 2, data });
            const units = {
                colonist: add("TEST_colonist", "$U7_Ranger", mid, mid + 3, { kind: "colonist", faction: "player" }),
                monster: add("TEST_monster", "$U7_Troll", mid - 1, mid + 2, { kind: "creature", species: "troll", tags: ["monster"], faction: null }),
                grazer: add("TEST_grazer", "$U7_Hare", mid + 1, mid + 2, { kind: "creature", species: "hare", tags: ["grazer"], faction: null }),
                allied: add("TEST_allied", "$U7_Townsman", mid - 2, mid - 2, { kind: "person", faction: fa.id, species: fa.species }),
                neutral: add("TEST_neutral", "$U7_Guard", mid - 2, mid + 2, { kind: "person", faction: fb.id, species: fb.species }),
                war: add("TEST_war", "$U7_Goblin", mid + 2, mid + 2, { kind: "person", faction: fc.id, species: fc.species })
            };
            const expect = { colonist: "friendly", monster: "hostile", grazer: "indifferent", allied: "friendly", neutral: "indifferent", war: "hostile" };
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
            await t.waitFrames(12);

            const charSpriteOf = ev => spriteset._characterSprites.find(s => s._character === ev);
            const mev = W.eventOf(units.monster.id);
            const m = Stance.markerOf(units.monster.id);
            const cs = charSpriteOf(mev);
            const bmp = m && m.bitmap;
            const want = colorOf("hostile"), wantA = Math.round(alphaOf() * 255);
            const center = bmp ? bmp.getPixel(24, 24) : "none", centerA = bmp ? bmp.getAlphaPixel(24, 24) : -1;
            const edgeA = bmp ? bmp.getAlphaPixel(0, 24) : -1;
            const order = m && cs ? `${tilemap.children.indexOf(m)} < ${tilemap.children.indexOf(cs)}` : "n/a";
            const under = !!m && !!cs && m.z === Z && m.z < cs.z && tilemap.children.indexOf(m) < tilemap.children.indexOf(cs);
            const atFeet = !!m && !!mev && m.x === mev.screenX() && m.y === footY(mev);
            t.check("marker_drawn", !!m && m.visible && m.parent === tilemap && under && atFeet && colorDist(center, want) <= 8 && Math.abs(centerA - wantA) <= 4 && edgeA > centerA,
                m ? `monster marker in the tilemap at (${m.x},${m.y}) vs feet (${mev ? mev.screenX() : "?"},${mev ? footY(mev) : "?"}), z ${m.z} vs character z ${cs ? cs.z : "?"} (child order ${order}); ` +
                    `bitmap ${bmp ? bmp._ufName : "none"} center ${center} alpha ${centerA} (want ${want} / ${wantA}), outline alpha ${edgeA}`
                    : `no marker for the monster unit (${Stance.markers().length} markers visible)`);
            const stances = Stance.markers().map(s => s.stance);
            const count = s => stances.filter(v => v === s).length;
            t.check("markers_per_unit", Object.values(units).every(u => Stance.markerOf(u)) && count("friendly") >= 2 + pairEvents.length && count("hostile") >= 2 && count("indifferent") >= 2,
                `${Stance.markers().length} markers visible: ${count("friendly")} friendly, ${count("indifferent")} indifferent, ${count("hostile")} hostile (want >= ${2 + pairEvents.length} / 2 / 2)`);

            // Really rendered: a pixel inside the neutral person's square changes when markers are switched off,
            // and moves toward the stance color when they're on. Four corners, because the character may cover some.
            const nev = W.eventOf(units.neutral.id);
            const nm = Stance.markerOf(units.neutral.id);
            const zoom = UF.Camera ? UF.Camera.zoom() : 1;
            const wantN = colorOf("indifferent");
            const corners = [];
            if (nm) {
                const g = nm.getGlobalPosition();
                const inset = 4 * zoom;
                const pts = [[g.x - 24 * zoom + inset, g.y - 48 * zoom + inset], [g.x + 24 * zoom - inset, g.y - 48 * zoom + inset],
                    [g.x - 24 * zoom + inset, g.y - inset], [g.x + 24 * zoom - inset, g.y - inset]].map(p => [Math.round(p[0]), Math.round(p[1])]);
                const on = SceneManager.snap();
                Stance.setEnabled(false);
                await t.waitFrames(2);
                const off = SceneManager.snap();
                const hiddenAll = Stance.markers().length === 0;
                Stance.setEnabled(true);
                await t.waitFrames(2);
                for (const [x, y] of pts) {
                    const p1 = on.getPixel(x, y), p2 = off.getPixel(x, y);
                    corners.push({ x, y, p1, p2, ok: p1 !== p2 && euclid(p1, wantN) < euclid(p2, wantN) });
                }
                t.check("marker_rendered", hiddenAll && corners.some(c => c.ok),
                    `screen pixels at the neutral marker's corners, markers on -> off: ${corners.map(c => `(${c.x},${c.y}) ${c.p1} -> ${c.p2}${c.ok ? " toward " + wantN : ""}`).join("; ")}; ` +
                    `${hiddenAll ? "all markers hidden while disabled" : "markers still visible while disabled"}; screen tone ${JSON.stringify($gameScreen.tone())}`);
            } else {
                t.check("marker_rendered", false, "no marker for the neutral person to sample");
            }
            t.screenshot("stance_markers");

            // Follows the character every frame, mid-step included. Sprites are positioned in Spriteset_Map.update,
            // which RMMZ runs before $gameMap.update moves the characters, so the marker is compared with the
            // character's drawn sprite (same frame), not with the character object (one step ahead).
            const walker = units.allied;
            W.sendUnit(walker.id, { area, x: mid + 2, y: mid - 2 });
            let midSamples = 0, midMatches = 0, worstLag = 0;
            const drawnFeet = (e, s) => ({ x: s.x, y: s.y + e.shiftY() + e.jumpHeight() });
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
            t.check("marker_follows", !walker.goal && !!wev && wev.x === mid + 2 && !!wm && !!wfeet && wm.x === wfeet.x && wm.y === wfeet.y && wm.x === wev.screenX() && wm.y === footY(wev) && midSamples > 0 && midMatches === midSamples,
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
            t.check("hidden_off_map", !!gev && !W.eventOf(units.grazer.id) && after === before - 1 && !stale,
                `grazer removed: event ${W.eventOf(units.grazer.id) ? "still on the map" : "gone"}, markers ${before} -> ${after}${stale ? ", its marker is still visible" : ""}`);

            // Cost: the sync over 120 frames.
            const s0 = Object.assign({}, Stance.stats());
            await t.waitFrames(120);
            const s1 = Stance.stats();
            const frames = s1.frames - s0.frames, avg = frames > 0 ? (s1.ms - s0.ms) / frames : Infinity;
            t.check("perf", avg <= 1, `sync averaged ${avg.toFixed(3)} ms over ${frames} frames at zoom ${zoom.toFixed(3)}, ${s1.shown} markers shown, ${spriteset._characterSprites.length} character sprites on the map`);

            // Clean up: test units, relations, zoom.
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
