//=============================================================================
// DEUS_Anim.js - Sprite-frame player: creature, object and equipment-layer animations from the art (VISION V41, V58, V60, V61)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Anim] Sprite-driven animation engine for 12-sprite character sets, directional action cycles, and object states.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_World
 * @orderAfter DEUS_Objects
 * @orderAfter DEUS_Doors
 * @orderAfter DEUS_Items
 * @orderAfter DEUS_Jobs
 * @orderAfter DEUS_Combat
 *
 * @help
 * VISION V58, V60, V61 (user, 2026-09-19: "all those animations are going to
 * be depicted with sprites"): every animation is a set of frames drawn in the
 * art and named in the sheet's sidecar (img/characters/<name>.json,
 * "animations"); worn and held equipment is a layer sheet stacked on the
 * body's current frame. This plugin only chooses frames. It moves, rotates,
 * scales, tints or flashes nothing. Where a sheet has no frames for a state,
 * the unit or object shows its plain frames.
 *
 * Units (world units on the map): the state is chosen each frame from
 *   hurt / attack (one-shots started by UF.Combat.playHitAnimation /
 *   playAttackAnimation, and by work strokes of hunters and predators next to
 *   their target), cast (data.casting), work (its job in the "work" state),
 *   walk (moving or stepping in place), idle (standing with no job), stand.
 *   A unit carrying the item of its haul or fetch job shows walk while it
 *   moves and stand while it is still (VISION V89, user 2026-09-19: carried
 *   loads are not drawn; the load is written in the unit's profile, UF_Sheet):
 *   the sheet's carry column (AR-600 column 7) is never shown, and a sidecar's
 *   "carry" list is ignored. Frames come from
 *   the sidecar's animations; walk and stand on a sheet with RPG Maker's
 *   3 x 4 geometry are left to RPG Maker. Timing: the sidecar's frameMs
 *   (default 150), counted in map updates, so everything stops while paused.
 * Facing rows (VISION V3, 8-way): the row is the unit's 8-way facing
 *   (UF_Movement8D dir8) as named in the sidecar's "facings" (an AR-600 sheet
 *   lists S, SW, W, NW, N, NE, E, SE); a sheet without a diagonal row shows
 *   the nearest of its four, the diagonal's horizontal side (NE and SE as E,
 *   NW and SW as W), which is also what RPG Maker draws on 3 x 4 stock sheets.
 *   A striking unit (UF.Combat.playAttackAnimation, work strokes) turns to its
 *   target in 8 directions; a caster whose data.casting names a target
 *   ({ targetId } or { x, y }) turns to it.
 * Death: a removal that is a death (UF.Combat.onUnitDeath, the hunt job's
 *   kill, data.dead, data.hp <= 0) plays the sheet's death frames in a pooled
 *   sprite and leaves the last frame on the ground as the remains for catalog
 *   anim.remainsHours game hours (saved in UF.World.state.anim). A sheet
 *   without death frames: the unit is removed and nothing stays.
 * UF_Combat's own sprite motion (the lunge, the hit recoil and red flash, the
 *   death collapse, the strike marks) is switched off at runtime by wrapping
 *   its functions; its combat logic runs unchanged.
 * Objects (UF_Objects' layer): sway, idle, lit, open and work frames by
 *   state; each cell has its own phase so a forest does not move in unison.
 * Equipment layers: img/characters/$UF_Layer_<itemId>.png (+ sidecar) for
 *   each equipped item, drawn on the body's frame; nothing without a sheet.
 *
 * API, state, events and checks: docs/systems/UF_Anim.md
 *
 * Replaced core methods: none (aliases only: Sprite_Character.update,
 * Sprite_Character.updateCharacterFrame, Spriteset_Map.createCharacters,
 * Spriteset_Map.update, Game_Map.update, Scene_Boot.start, Scene_Map.start).
 * Wrapped at runtime (their files are not edited): UF.World.removeUnit,
 * UF.Combat.onUnitDeath, UF.Combat.playAttackAnimation,
 * UF.Combat.playHitAnimation, UF.Jobs.define, the "hunt" handler's apply,
 * UF.Objects.Sprite_Layer.prototype.update, ._assign and ._release.
 */

(() => {
    "use strict";

    const TICK_MS = 1000 / 60;      // one map update at x1
    const FRAME_MS = 150;           // default sidecar frameMs
    const EVENT_BASE = 1000;        // UF_World: unit event id = 1000 + unit id
    const REMAINS_HOURS = 12;       // default when the catalog has no anim.remainsHours
    const REMAINS_CAP = 200;        // saved remains; the oldest is dropped beyond this
    const MAX_GHOSTS = 24;          // death animations playing at once; more deaths go straight to remains
    const POOL_KEEP = 48;           // released sprites kept for reuse per pool; more are destroyed
    const STROKE_TICKS = 30;        // map updates per work stroke of hunters and predators (no UF.Beat)
    const VIEW_MARGIN = 2;          // cells around the view where remains keep a sprite
    const COMBAT_ATTACK_TICKS = 14; // how long UF_Combat's attack motion would have run (kept as an inert timer)
    const COMBAT_HIT_TICKS = 10;    // the same for its hit reaction
    const CULL_PX = 144;            // unit sprites farther than this outside the view are not animated
    const LAYER_PREFIX = "$UF_Layer_";
    const PHASE_SALT = 0x5a1e;
    const FACING = { 2: "S", 4: "W", 6: "E", 8: "N" };
    const FACING8 = ["", "SW", "S", "SE", "W", "", "E", "NW", "N", "NE"]; // by numpad direction (UF_Movement8D dir8)
    const valid8 = d => (d >= 1 && d <= 9 && d !== 5 ? d : 2);
    const side4 = d => (d === 1 || d === 7 ? 4 : d === 3 || d === 9 ? 6 : validDir(d)); // a diagonal's horizontal side
    const dir8Of = ch => valid8(ch && ch.dir8 ? ch.dir8() : ch ? ch.direction() : 2);
    const UNIT_ANIMS = ["stand", "walk", "work", "attack", "cast", "hurt", "death", "idle"];
    const IGNORED_ANIMS = ["carry"];  // VISION V89: loads are not drawn; AR-600 column 7 stays in the grid (the tools fill it with the stand frame) and is never shown
    const OBJECT_ANIMS = ["stand", "sway", "idle", "lit", "open", "work"];
    const SLOTS = ["feet", "legs", "waist", "armor", "torso", "neck", "shoulders", "arms", "hands", "ring1", "ring2", "head", "eyes", "back", "offHand", "shield", "mainHand", "weapon"];      // drawing order, bottom to top
    const SLOT_ALIAS = {
        torso: "clothes",
        armor: "body",
        mainHand: "weapon",
        weapon: "tool",
        offHand: "shield",
        feet: "legs",
        legs: "feet"
    };
    const BEHIND = { weapon: [8], mainHand: [8], shield: [8], offHand: [8], back: [2] };                  // facings where a slot's layer is behind the body

    const World = () => (window.UF && UF.World) || null;
    const Combat = () => (window.UF && UF.Combat) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const hexToInt = hex => {
        const n = parseInt(String(hex || "").replace("#", ""), 16);
        return Number.isFinite(n) ? n & 0xffffff : 0xffffff;
    };
    const validDir = d => (d === 2 || d === 4 || d === 6 || d === 8 ? d : 2);
    const cellKey = (x, y) => y * 65536 + x;
    const validCols = v => (Array.isArray(v) && v.length > 0 && v.every(c => Number.isInteger(c) && c >= 0) ? v : null);
    const frameTicksOf = sc => ((sc && sc.frameMs > 0 ? sc.frameMs : FRAME_MS) * 60) / 1000; // map updates per frame (150 ms = 9)

    const stats = {
        deaths: 0, deathsPlain: 0, ghosts: 0, created: 0, layerSprites: 0, oneShots: 0, strokes: 0,
        combatAttacks: 0, combatHits: 0, combatMotionStopped: 0, strikeMarksDropped: 0, guarded: 0, culled: 0
    };
    const perf = { frames: 0, ms: 0, worst: 0, unitMs: 0, objectMs: 0, layerMs: 0, strokes: 0, strokeMs: 0, recent: new Float64Array(256) };
    let frameMs = 0; // UF_Anim time spent in the frame being built
    const errors = [];
    function report(where, e) {
        errors.push(`${where}: ${e && e.message ? e.message : e}`);
        if (errors.length > 20) errors.shift();
        console.error(`[UF_Anim] ${where}`, e);
    }

    //-------------------------------------------------------------------------
    // Sidecars: img/characters/<name>.json, loaded once by XHR (units and layers; objects use UF.Sidecars)

    const sidecars = new Map();  // name -> undefined (loading) | null (none) | object
    const overrides = new Map(); // name -> sidecar set in code (tests, tools); wins over the file
    function sidecar(name) {
        if (!name) return null;
        if (overrides.has(name)) return overrides.get(name);
        if (sidecars.has(name)) return sidecars.get(name);
        sidecars.set(name, undefined);
        try {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "img/characters/" + Utils.encodeURI(name) + ".json");
            xhr.overrideMimeType("application/json");
            xhr.onload = () => {
                let data = null;
                if (xhr.status < 400) {
                    try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }
                }
                sidecars.set(name, data && typeof data === "object" ? data : null);
            };
            xhr.onerror = () => sidecars.set(name, null);
            xhr.send();
        } catch (e) {
            sidecars.set(name, null);
        }
        return undefined;
    }
    // Objects: UF_Objects' cache (UF.Sidecars), so each object sheet's sidecar is fetched once for both plugins.
    function objectSidecar(image) {
        if (overrides.has(image)) return overrides.get(image);
        const S = window.UF && UF.Sidecars;
        if (S && typeof S.get === "function" && typeof S.isLoaded === "function") {
            const v = S.get(image); // starts the load when needed
            return S.isLoaded(image) ? v : undefined;
        }
        return sidecar(image);
    }

    // What a sheet's sidecar says, parsed once: { fw, fh, rows[4], frameTicks, anims{}, extra, behind }.
    const unitInfos = new Map();
    function unitInfo(name) {
        if (!name) return null;
        const cached = unitInfos.get(name);
        if (cached !== undefined) return cached;
        const sc = sidecar(name);
        if (sc === undefined) return null; // still loading: plain frames for now, asked again next frame
        let info = null;
        if (sc && sc.animations && typeof sc.animations === "object") {
            const a = sc.animations, anims = {};
            let extra = false;
            for (const k of Object.keys(a)) anims[k] = validCols(a[k]); // every list the sheet names (play() takes any but the ignored)
            for (const k of IGNORED_ANIMS) anims[k] = null;
            for (const k of UNIT_ANIMS) {
                anims[k] = validCols(k === "death" ? a.death || a.dead : a[k]);
                if (anims[k] && k !== "stand" && k !== "walk") extra = true;
            }
            info = { anims, extra };
        } else if (sc) {
            info = { anims: {}, extra: false }; // a sidecar without animations still gives the geometry (layer sheets)
            for (const k of UNIT_ANIMS) info.anims[k] = null;
        }
        if (info) {
            info.name = name;
            info.fw = sc.frameWidth > 0 ? sc.frameWidth | 0 : 0;
            info.fh = sc.frameHeight > 0 ? sc.frameHeight | 0 : 0;
            info.rows = [2, 4, 6, 8].map((d, i) => {
                const j = Array.isArray(sc.facings) ? sc.facings.indexOf(FACING[d]) : -1;
                return j >= 0 ? j : i;
            });
            // rows8[numpad direction]: the diagonal's own row when the sheet has it, else its horizontal side's row.
            info.rows8 = FACING8.map((name, d) => {
                if (!name) return info.rows[0];
                const j = Array.isArray(sc.facings) ? sc.facings.indexOf(name) : -1;
                return j >= 0 ? j : info.rows[(side4(d) - 2) >> 1];
            });
            info.diag = Array.isArray(sc.facings) && ["SW", "NW", "NE", "SE"].some(n => sc.facings.includes(n));
            info.frameTicks = frameTicksOf(sc);
            info.behind = Array.isArray(sc.behind) ? sc.behind.slice() : null;
        }
        unitInfos.set(name, info);
        return info;
    }
    function forgetInfos() {
        unitInfos.clear();
        objInfos.length = 0;
    }

    //-------------------------------------------------------------------------
    // The clock (map updates: stops while paused, runs faster with the speed-up), jobs by unit, busy cells

    let ticks = 0;
    let indexTick = -1;
    const jobOfUnit = new Map(); // unit id -> its active job
    const busyCells = new Set(); // cell keys that are the target of a job in the "work" state (area on screen)
    function refreshIndex() {
        if (indexTick === ticks) return;
        indexTick = ticks;
        jobOfUnit.clear();
        busyCells.clear();
        const W = World();
        const js = W && W.state ? W.state.jobs : null;
        const list = js && Array.isArray(js.list) ? js.list : null;
        if (!list) return;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        for (let i = 0; i < list.length; i++) {
            const j = list[i];
            if (!j || !j.assigned || (j.state !== "travel" && j.state !== "work")) continue;
            jobOfUnit.set(j.assigned, j);
            const t = j.target;
            if (j.state === "work" && t && area && t.area && t.area.x === area.x && t.area.y === area.y && ((t.area.z !== undefined && area.z !== undefined) ? t.area.z === area.z : true)) busyCells.add(cellKey(t.x, t.y));
        }
    }
    const hashOf = (...parts) => {
        const W = World();
        if (W && typeof W.hash32 === "function") return W.hash32(...parts) >>> 0;
        let h = 0x811c9dc5;
        for (const p of parts) h = Math.imul(h ^ (p | 0), 16777619) >>> 0;
        return h;
    };
    const unitPhase = id => (Math.imul((id | 0) + 1, 2654435761) >>> 16) & 1023;

    //-------------------------------------------------------------------------
    // One-shots (attack, hurt, or any animation a sheet names): unit id -> { anim, start }

    const shots = new Map();
    function play(unitOrId, anim) {
        const W = World();
        const u = typeof unitOrId === "number" ? (W ? W.unit(unitOrId) : null) : unitOrId;
        if (!u || !anim || IGNORED_ANIMS.includes(String(anim))) return false; // V89: a carry pose is never played
        shots.set(u.id, { anim: String(anim), start: ticks });
        stats.oneShots++;
        const info = u.image ? unitInfo(u.image.characterName) : null;
        return !!(info && Object.prototype.hasOwnProperty.call(info.anims, anim) && info.anims[anim]);
    }

    //-------------------------------------------------------------------------
    // Unit frames: which animation, which column, in which row

    function carrying(u, job) {
        if (job.type !== "haul" && job.type !== "fetch") return false;
        const I = Items();
        const id = job.params ? job.params.itemId : undefined;
        const it = I && id !== undefined && id !== null ? I.get(id) : null;
        return !!it && it.holder === u.id;
    }

    // A sprite's sheet geometry, read once per bitmap (Bitmap.width reads the canvas or image element: slow per frame).
    function geoOf(sp) {
        const b = sp.bitmap;
        let g = sp._ufGeo;
        if (g && g.bmp === b && g.ok) return g;
        if (!g) g = sp._ufGeo = { bmp: null, ok: false, bw: 0, bh: 0, pw: 0, ph: 0 };
        g.bmp = b;
        g.ok = false;
        if (!b || !b.isReady()) return g;
        const bw = b.width, bh = b.height;
        if (!(bw > 0) || !(bh > 0)) return g;
        g.bw = bw;
        g.bh = bh;
        g.pw = sp._isBigCharacter ? bw / 3 : bw / 12; // = Sprite_Character.patternWidth() for character sheets
        g.ph = sp._isBigCharacter ? bh / 4 : bh / 8;
        g.ok = true;
        return g;
    }

    // Fills sp._ufPick: { unitId, want (the state), shown (the animation whose frames are used), own (UF_Anim sets the
    // frame; false = RPG Maker's frame), anim/k (for layers), col, row, x, y, w, h, job }.
    function pickUnit(sp, units) {
        let pk = sp._ufPick;
        if (!pk) pk = sp._ufPick = { unitId: 0, unit: null, want: "", shown: "", own: false, anim: "", k: 0, col: 0, row: 0, x: 0, y: 0, w: 0, h: 0, job: null };
        pk.unitId = 0;
        pk.unit = null;
        pk.own = false;
        pk.job = null;
        const ch = sp._character;
        if (!ch || !(ch._eventId >= EVENT_BASE)) return pk;
        const u = units ? units[ch._eventId - EVENT_BASE] : null;
        if (!u) return pk;
        pk.unitId = u.id;
        pk.unit = u;
        const info = unitInfo(ch.characterName());
        const moving = ch.isMoving(), stepping = ch.hasStepAnime();
        const job = jobOfUnit.get(u.id) || null;
        pk.job = job;
        let want = "", cols = null, start = -1, loop = false, walkLike = false, hauling = false;
        const shot = shots.get(u.id);
        if (shot) {
            const c = info && Object.prototype.hasOwnProperty.call(info.anims, shot.anim) ? info.anims[shot.anim] : null;
            const ft = info ? info.frameTicks : frameTicksOf(null);
            if (ticks - shot.start < (c ? c.length : 1) * ft) {
                want = shot.anim;
                cols = c;
                start = shot.start;
            } else {
                shots.delete(u.id);
            }
        }
        if (!want && u.data && u.data.casting) {
            faceCastTarget(ch, u);
            want = "cast";
            cols = info ? info.anims.cast : null;
            loop = true;
        }
        if (!want && job) {
            if (carrying(u, job)) {
                // V89: a unit carrying its job's item looks as it does without it: walk frames while it moves, the stand
                // frame while it is still (not the put-down's work frames). The load is written in its profile (UF_Sheet).
                hauling = true;
                want = moving ? "walk" : "stand";
                cols = info ? (moving ? info.anims.walk : info.anims.stand) : null;
                walkLike = moving;
            } else if (job.state === "work") {
                want = "work";
                cols = info ? info.anims.work : null;
                loop = true;
            }
        }
        if (!want) {
            if (moving || stepping) want = "walk";
            else if (job) want = "stand";
            else {
                want = "idle";
                cols = info ? info.anims.idle : null;
                loop = true;
            }
        }
        let shown = want;
        if (!cols) {
            loop = false;
            start = -1;
            if (moving || (stepping && !hauling)) {
                shown = "walk";
                cols = info ? info.anims.walk : null;
                walkLike = true;
            } else {
                shown = "stand";
                cols = info ? info.anims.stand : null;
                walkLike = false;
            }
        }
        pk.want = want;
        pk.shown = shown;
        const g = geoOf(sp);
        const plain = shown === "walk" || shown === "stand";
        const rmmzGeometry = !info || !(info.fw > 0) || (g.ok && info.fw === g.pw && info.fh === g.ph);
        if (!info || !cols || !g.ok || (plain && rmmzGeometry)) return rmmzPick(sp, pk, ch, g);
        const n = cols.length;
        let k;
        if (walkLike) k = n === 3 ? ch.pattern() : (ch._pattern | 0) % n;
        else if (start >= 0) k = Math.min(n - 1, Math.floor((ticks - start) / info.frameTicks));
        else if (loop) k = Math.floor((ticks + unitPhase(u.id)) / info.frameTicks) % n;
        else k = 0;
        const col = cols[k];
        const row = info.rows8[dir8Of(ch)];
        const pw = g.pw, ph = g.ph;
        const fw = info.fw > 0 ? info.fw : pw, fh = info.fh > 0 ? info.fh : ph;
        const x = sp.characterBlockX() * pw + col * fw, y = sp.characterBlockY() * ph + row * fh;
        if (x + fw > g.bw || y + fh > g.bh) return rmmzPick(sp, pk, ch, g); // the sidecar names a column the sheet lacks
        pk.own = true;
        pk.anim = shown;
        pk.k = k;
        pk.col = col;
        pk.row = row;
        pk.x = x;
        pk.y = y;
        pk.w = fw;
        pk.h = fh;
        return pk;
    }
    // A caster turns to what it casts at: data.casting = { targetId } (a unit) or { x, y } (a cell); true names nothing.
    function faceCastTarget(ch, u) {
        const c = u.data.casting;
        if (!c || typeof c !== "object" || !ch.faceToward8) return;
        const W = World();
        const t = Number.isInteger(c.targetId) && W ? W.unit(c.targetId) : Number.isInteger(c.x) && Number.isInteger(c.y) ? c : null;
        if (t && (!t.area || !u.area || (t.area.x === u.area.x && t.area.y === u.area.y)) && (t.x !== ch.x || t.y !== ch.y)) ch.faceToward8(t.x - ch.x, t.y - ch.y);
    }
    // RPG Maker draws this frame itself; the pick only records it (for the layers and for readers).
    function rmmzPick(sp, pk, ch, g) {
        pk.own = false;
        pk.anim = ch.isMoving() || ch.hasStepAnime() ? "walk" : "stand";
        pk.k = ch.pattern();
        pk.col = sp.characterPatternX();
        pk.row = sp.characterPatternY();
        pk.w = g && g.ok ? g.pw : 0;
        pk.h = g && g.ok ? g.ph : 0;
        pk.x = (sp.characterBlockX() + pk.col) * pk.w;
        pk.y = (sp.characterBlockY() + pk.row) * pk.h;
        return pk;
    }
    function setBodyFrame(sp, pk) {
        sp.updateHalfBodySprites();
        if (sp._bushDepth > 0) {
            const d = sp._bushDepth;
            sp._upperBody.setFrame(pk.x, pk.y, pk.w, pk.h - d);
            sp._lowerBody.setFrame(pk.x, pk.y + pk.h - d, pk.w, d);
            sp.setFrame(pk.x, pk.y, 0, pk.h);
        } else {
            sp.setFrame(pk.x, pk.y, pk.w, pk.h);
        }
    }

    //-------------------------------------------------------------------------
    // Equipment layers: $UF_Layer_<itemId> sheets as children of the unit's Sprite_Character

    // A slot value is an item record id (UF_Items / UF_Jobs; shown only while the unit holds it) or a catalog type id.
    function equippedType(u, v) {
        if (v === null || v === undefined || v === "") return null;
        const I = Items();
        if (typeof v === "number") {
            const it = I ? I.get(v) : null;
            return it && it.holder === u.id ? it.type : null;
        }
        if (typeof v === "string") return !I || I.type(v) ? v : null;
        if (typeof v === "object" && v.type) return equippedType(u, v.id !== undefined ? v.id : v.type);
        return null;
    }
    const recipeTool = job => {
        const c = window.$ufWorldCatalog;
        const list = (c && c.recipes && c.recipes.list) || [];
        const r = job.params ? list.find(x => x.id === job.params.recipeId) : null;
        return r && r.tool ? r.tool : null;
    };
    function toolHelps(t, job) {
        if (!t || !t.tool) return 0;
        const m = t.tool[job.type];
        if (typeof m === "number" && m > 0) return m;
        if (job.type === "craft") {
            const tag = recipeTool(job);
            if (tag && Array.isArray(t.tags) && t.tags.includes(tag)) return 1.5;
        }
        return 0;
    }
    // The tool a working unit holds for its job: the equipped one when it helps this job, else the best one it carries.
    function jobTool(u, job) {
        const I = Items();
        if (!I) return null;
        const eq = (u.data && u.data.equipment) || {};
        const eqVal = eq.mainHand !== undefined && eq.mainHand !== null && eq.mainHand !== "" ? eq.mainHand : (eq.weapon !== undefined && eq.weapon !== null && eq.weapon !== "" ? eq.weapon : eq.tool);
        const eqType = equippedType(u, eqVal);
        if (eqType && toolHelps(I.type(eqType), job) > 0) return eqType;
        const inv = u.data && Array.isArray(u.data.inventory) ? u.data.inventory : null;
        if (!inv) return null;
        let best = null, bestM = 0;
        for (let i = 0; i < inv.length; i++) {
            const it = I.get(inv[i]);
            if (!it || it.holder !== u.id) continue;
            const m = toolHelps(I.type(it.type), job);
            if (m > bestM) {
                best = it.type;
                bestM = m;
            }
        }
        return best;
    }

    // Whether a file of the game folder exists: true/false in NW.js (a synchronous check, so a missing layer sheet is
    // never requested and prints no load error in the console), null in a browser (unknown: the load is tried).
    let fsMod = null, gameBase = null;
    function fileExists(rel) {
        try {
            if (!Utils.isNwjs()) return null;
            if (!fsMod) {
                fsMod = require("fs");
                gameBase = require("path").dirname(process.mainModule.filename);
            }
            return fsMod.existsSync(require("path").join(gameBase, rel));
        } catch (e) {
            return null;
        }
    }
    // Layer sheets by item type id: { typeId, name, url, bitmap } (bitmap null when the file does not exist; a sheet
    // that fails to load stays an error bitmap; neither is drawn).
    const layerSheets = new Map();
    function layerSheet(typeId) {
        let e = layerSheets.get(typeId);
        if (!e) {
            const name = LAYER_PREFIX + typeId;
            const url = "img/characters/" + Utils.encodeURI(name) + ".png";
            const cached = ImageManager._cache ? ImageManager._cache[url] : null;
            const exists = cached ? true : fileExists(`img/characters/${name}.png${Utils.hasEncryptedImages() ? "_" : ""}`);
            // Loaded outside ImageManager's cache: a sheet that fails to load must not stop the game with a load error.
            e = { typeId, name, url, bitmap: cached || (exists === false ? null : Bitmap.load(url)) };
            layerSheets.set(typeId, e);
        }
        return e;
    }
    // The sheet when it can be drawn now (image loaded, sidecar answered), else null.
    function usableLayer(typeId) {
        const e = layerSheet(typeId);
        if (e.w > 0) return e;
        const b = e.bitmap;
        if (!b || b.isError() || !b.isReady() || !(b.width > 0)) return null;
        if (sidecar(e.name) === undefined) return null;
        e.w = b.width;
        e.h = b.height;
        return e;
    }

    const wantTypes = [], wantSlots = [];
    function wantedLayers(u, pk) {
        let n = 0;
        const d = u.data;
        const eq = d && d.equipment && typeof d.equipment === "object" ? d.equipment : null;
        const working = pk.want === "work" && !!pk.job;
        if (!eq && !working) return 0;
        const workTool = working ? jobTool(u, pk.job) : null;
        for (let i = 0; i < SLOTS.length; i++) {
            const slot = SLOTS[i];
            let t = null;
            if ((slot === "weapon" || slot === "mainHand") && workTool) t = workTool;
            else if (eq) {
                let v = eq[slot];
                if ((v === null || v === undefined || v === "") && SLOT_ALIAS[slot]) v = eq[SLOT_ALIAS[slot]];
                t = equippedType(u, v);
            }
            if (!t || !usableLayer(t)) continue;
            wantTypes[n] = t;
            wantSlots[n] = slot;
            n++;
        }
        return n;
    }

    const layerOwners = new Map(); // unit id -> the Sprite_Character holding its layer sprites
    function syncLayers(sp, pk, layer) {
        const L = sp._ufLayers;
        const n = pk.unit ? wantedLayers(pk.unit, pk) : 0;
        if (!n) {
            if (L) releaseLayers(sp);
            return;
        }
        if (!layer) return;
        let st = L;
        if (!st || st.unitId !== pk.unitId) {
            if (st) releaseLayers(sp);
            st = sp._ufLayers = { kids: [], over: null, sig: -1, unitId: pk.unitId };
            layerOwners.set(pk.unitId, sp);
        }
        const dir = validDir(sp._character.direction()), d8 = dir8Of(sp._character);
        while (st.kids.length > n) layer.releaseKid(st.kids.pop().sprite);
        while (st.kids.length < n) st.kids.push({ sprite: layer.acquireKid(), typeId: null, slot: "", behind: false });
        let anyBehind = false, sig = n;
        for (let i = 0; i < n; i++) {
            const kid = st.kids[i], e = layerSheet(wantTypes[i]), s = kid.sprite;
            kid.typeId = wantTypes[i];
            kid.slot = wantSlots[i];
            if (s.bitmap !== e.bitmap) s.bitmap = e.bitmap;
            const li = unitInfo(e.name);
            const fw = li && li.fw > 0 ? li.fw : pk.w, fh = li && li.fh > 0 ? li.fh : pk.h;
            const la = li ? li.anims[pk.anim] : null;
            const col = la ? la[pk.k % la.length] : pk.col;
            const row = li ? li.rows8[d8] : pk.row;
            const x = col * fw, y = row * fh;
            if (x + fw <= e.w && y + fh <= e.h) {
                s.setFrame(x, y, fw, fh);
                s.visible = true;
            } else {
                s.visible = false; // the layer sheet lacks this frame
            }
            if (s.anchor.x !== sp.anchor.x || s.anchor.y !== sp.anchor.y) s.anchor.set(sp.anchor.x, sp.anchor.y);
            // Behind the body: the sheet's own list (by its diagonal facing when it has diagonal rows), else the default
            // by the 4-way side shown.
            const b = li && li.behind ? li.behind.includes(li.diag ? FACING8[d8] : FACING[dir]) : !!BEHIND[kid.slot] && BEHIND[kid.slot].includes(dir);
            kid.behind = b;
            if (b) anyBehind = true;
            if (b) sig += 1 << (i + 8);
        }
        const needOver = anyBehind && !(sp._bushDepth > 0);
        if (needOver && !st.over) st.over = layer.acquireKid();
        if (!needOver && st.over) {
            layer.releaseKid(st.over);
            st.over = null;
        }
        if (st.over) {
            // The body drawn again over the layers behind it (a child can't be drawn under its parent's own image).
            const o = st.over;
            if (o.bitmap !== sp.bitmap) o.bitmap = sp.bitmap;
            const f = sp._frame;
            o.setFrame(f.x, f.y, f.width, f.height);
            if (o.anchor.x !== sp.anchor.x || o.anchor.y !== sp.anchor.y) o.anchor.set(sp.anchor.x, sp.anchor.y);
            if (o.tint !== sp.tint) o.tint = sp.tint;
            o.visible = true;
            if (sig >= 0) sig += 1 << 30;
        }
        const children = sp.children;
        let lastFront = null;
        for (let i = n - 1; i >= 0 && !lastFront; i--) if (!st.kids[i].behind) lastFront = st.kids[i].sprite;
        if (sig < 0 || st.sig !== sig || (lastFront && children[children.length - 1] !== lastFront)) {
            arrange(sp, st);
            st.sig = sig;
        }
    }
    // Children order: layers behind the body, the body again, RMMZ's half-body sprites (bushes), layers in front.
    function arrange(sp, st) {
        for (const k of st.kids) if (k.sprite.parent) k.sprite.parent.removeChild(k.sprite);
        if (st.over && st.over.parent) st.over.parent.removeChild(st.over);
        let i = 0;
        for (const k of st.kids) if (k.behind) sp.addChildAt(k.sprite, i++);
        if (st.over) sp.addChildAt(st.over, i++);
        for (const k of st.kids) if (!k.behind) sp.addChild(k.sprite);
    }
    function releaseLayers(sp) {
        const st = sp._ufLayers;
        if (!st) return;
        const layer = animLayer();
        const drop = s => {
            if (layer) layer.releaseKid(s);
            else if (s.parent) s.parent.removeChild(s);
        };
        for (const k of st.kids) drop(k.sprite);
        if (st.over) drop(st.over);
        sp._ufLayers = null;
        if (layerOwners.get(st.unitId) === sp) layerOwners.delete(st.unitId);
    }

    //-------------------------------------------------------------------------
    // UF_Combat's own sprite motion: a stored attack/hit animation is replaced by an inert timer of the same length (so
    // code that reads event._combatAnim as "in a combat reaction" still sees one), the offset is dropped and the walk
    // pattern its lunge flipped is put back.

    function inertTimer(ev, length) {
        return {
            frame: 0,
            _ufInert: true,
            update() {
                this.frame++;
                if (this.frame > length && ev._combatAnim === this) ev._combatAnim = null;
            }
        };
    }
    function stopCombatMotion(ev, length) {
        if (!ev) return false;
        let stopped = false;
        if (ev._combatAnim && !ev._combatAnim._ufInert) {
            ev._combatAnim = inertTimer(ev, length);
            stopped = true;
        }
        if (ev._combatOffset) {
            ev._combatOffset = null;
            stopped = true;
        }
        if (ev._originalPattern !== undefined) {
            if (ev._originalPattern !== null) ev._pattern = ev._originalPattern;
            delete ev._originalPattern;
        }
        if (stopped) stats.combatMotionStopped++;
        return stopped;
    }
    const deathQueue = new Set(); // units found in UF_Combat's own collapse: removed (as deaths) at the next map update

    // Before RMMZ's update and every alias under it (UF_Combat's reads _combatOffset / _combatAnim there).
    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        const ch = this._character;
        if (ch && ((ch._combatAnim && !ch._combatAnim._ufInert) || ch._combatOffset)) {
            try {
                const W = World(), u = W ? W.unitOfEvent(ch) : null;
                if (u && u.data && u.data._isDying && ch._combatAnim && !ch._combatAnim._ufInert) {
                    ch._combatAnim = null;
                    ch._combatOffset = null;
                    deathQueue.add(u.id);
                } else {
                    stopCombatMotion(ch, COMBAT_ATTACK_TICKS);
                }
                stats.guarded++;
            } catch (e) {
                report("combat guard", e);
            }
        }
        _Sprite_Character_update.call(this);
    };

    // RPG Maker draws every character's frame as usual, except a unit whose frame UF_Anim chose (it keeps that frame
    // until UF_Anim's pass after the spriteset update sets the next one).
    const _Sprite_Character_updateCharacterFrame = Sprite_Character.prototype.updateCharacterFrame;
    Sprite_Character.prototype.updateCharacterFrame = function() {
        if (this._ufOwn) return;
        _Sprite_Character_updateCharacterFrame.call(this);
    };
    // The view in tilemap pixels (UF_Camera scales the tilemap), set before each spriteset update.
    const cull = { x0: -CULL_PX, y0: -CULL_PX, x1: 1e9, y1: 1e9 };
    // Every unit sprite once per frame, after the tilemap updated them (positions are current).
    function stepUnits(spriteset) {
        const list = spriteset._characterSprites;
        const W = World();
        const units = W && W.state ? W.state.units : null;
        if (!list || !units) return;
        const layer = spriteset._ufAnim || null;
        refreshIndex();
        for (let i = 0; i < list.length; i++) {
            const sp = list[i];
            const ch = sp._character;
            if (!ch || !(ch._eventId >= EVENT_BASE) || !sp.parent) continue;
            // Off screen nothing animates (V50): the unit keeps its last frame until it comes into view again.
            if (sp._ufFramed && (sp.x < cull.x0 || sp.x > cull.x1 || sp.y < cull.y0 || sp.y > cull.y1)) {
                stats.culled++;
                continue;
            }
            sp._ufFramed = true;
            let pk = null;
            try {
                pk = pickUnit(sp, units);
                if (pk.own) {
                    sp._ufOwn = true;
                    setBodyFrame(sp, pk);
                } else if (sp._ufOwn) {
                    sp._ufOwn = false;
                    _Sprite_Character_updateCharacterFrame.call(sp); // back to RPG Maker's frame at once
                }
            } catch (e) {
                report("unit frame", e);
                sp._ufOwn = false;
                pk = null;
            }
            if (pk && (pk.unitId || sp._ufLayers)) {
                try {
                    syncLayers(sp, pk, layer);
                } catch (e) {
                    report("layers", e);
                }
            }
        }
    }

    //-------------------------------------------------------------------------
    // Objects: UF_Objects' pooled sprites step their sidecar frames by state

    const objInfos = []; // typeId -> info | null (undefined: sidecar not known yet)
    let objSource = null;
    function objectInfo(typeId) {
        const cat = window.$ufWorldCatalog;
        const src = cat ? cat.objects : null;
        if (src !== objSource) {
            objInfos.length = 0;
            objSource = src;
        }
        const cached = objInfos[typeId];
        if (cached !== undefined) return cached;
        const O = Objects();
        const type = O ? O.type(typeId) : null;
        if (!type || !type.image || type.tile || type.gen || type.autotile === "wall" || (Array.isArray(type.tags) && type.tags.includes("wall"))) {
            objInfos[typeId] = null;
            return null;
        }
        const sc = objectSidecar(type.image);
        if (sc === undefined) return undefined;
        let info = null;
        if (sc && sc.animations && typeof sc.animations === "object") {
            const anims = {};
            let any = false;
            for (const k of OBJECT_ANIMS) {
                anims[k] = validCols(sc.animations[k]);
                if (anims[k] && k !== "stand") any = true;
            }
            if (any) {
                const D = window.UF && UF.Doors;
                info = {
                    id: type.id,
                    big: ImageManager.isBigCharacter(type.image),
                    index: type.characterIndex | 0,
                    fw: sc.frameWidth > 0 ? sc.frameWidth | 0 : 0,
                    fh: sc.frameHeight > 0 ? sc.frameHeight | 0 : 0,
                    frameTicks: frameTicksOf(sc),
                    anims,
                    lit: type.lit === true || (Array.isArray(type.tags) && type.tags.includes("lit")),
                    fixed: !anims.lit && !anims.work && !anims.open, // sway / idle only: its state never changes
                    door: !!(D && typeof D.isDoorType === "function" && D.isDoorType(type))
                };
            }
        }
        objInfos[typeId] = info;
        return info;
    }
    // The state an object sprite shows now (s: its UF_Anim state, with the cell x, y): the name in stName and the columns
    // in stCols (null: its plain frame).
    let stName = "", stCols = null;
    function objectState(info, s, area, key) {
        const a = info.anims;
        const D = window.UF && UF.Doors;
        stName = "";
        stCols = null;
        if (a.open && ((info.door && D && area && D.isOpen(area, s.x, s.y)) || (!info.door && busyCells.has(key)))) {
            stName = "open";
            stCols = a.open;
        } else if (a.lit && (info.lit || busyCells.has(key))) {
            stName = "lit";
            stCols = a.lit;
        } else if (a.work && busyCells.has(key)) {
            stName = "work";
            stCols = a.work;
        } else if (a.sway) {
            stName = "sway";
            stCols = a.sway;
        } else if (a.idle) {
            stName = "idle";
            stCols = a.idle;
        }
        return stCols;
    }
    // Frame size and block of an object type on its bitmap, read once per bitmap.
    function objectGeo(info, bmp) {
        if (info.geoBmp === bmp) return info;
        const bw = bmp.width, bh = bmp.height;
        if (!(bw > 0)) return null;
        info.geoBmp = bmp;
        info.gw = info.fw || (info.big ? Math.floor(bw / 3) : Math.floor(bw / 12));
        info.gh = info.fh || (info.big ? Math.floor(bh / 4) : Math.floor(bh / 8));
        info.gx = info.big ? 0 : (info.index % 4) * 3;
        info.gy = (info.big ? 0 : Math.floor(info.index / 4) * 4) * info.gh;
        info.gcols = Math.floor(bw / info.gw); // columns the sheet has
        info.grows = info.gy + info.gh <= bh;
        return info;
    }
    // Each UF_Objects layer keeps the list of its sprites that show an animated object (layer._ufAnimReg), kept in step
    // by the wraps of its _assign and _release below; a sprite whose next column isn't due costs one comparison.
    function registryOf(layer) {
        const cat = window.$ufWorldCatalog;
        const src = cat ? cat.objects : null;
        if (src !== objSource) {
            objInfos.length = 0;
            objSource = src;
        }
        let r = layer._ufAnimReg;
        if (!r || r.source !== src) {
            // First use, or another catalog list: built from the sprites in use.
            if (r) for (const a of r.list) a.idx = -1;
            r = layer._ufAnimReg = { list: [], pending: [], source: src };
            if (Array.isArray(layer._active)) for (const sp of layer._active) track(r, sp);
        }
        return r;
    }
    function animOf(sp) {
        let a = sp._ufA;
        if (!a) a = sp._ufA = { sprite: sp, idx: -1, pend: false, type: 0, info: null, fixed: false, x: 0, y: 0, cell: -1, frame: null, on: false, state: "", col: null, tick: -1, phase: 0, next: 0, base: null };
        return a;
    }
    // A sprite given an object (or found in use): listed when its type animates, pending while its sidecar loads.
    function track(r, sp) {
        const a = animOf(sp);
        untrack(r, a);
        const t = sp._ufType;
        a.type = t;
        a.info = null;
        a.on = false;
        a.state = "";
        a.col = null;
        a.next = 0;
        if (!t) return;
        a.x = sp._ufX;
        a.y = sp._ufY;
        a.cell = cellKey(a.x, a.y);
        a.frame = sp._frame;
        a.phase = hashOf(PHASE_SALT, a.x, a.y) & 0xffff;
        const info = objectInfo(t);
        if (info === undefined) {
            a.pend = true;
            r.pending.push(a);
        } else if (info) {
            a.info = info;
            a.fixed = info.fixed;
            a.idx = r.list.length;
            r.list.push(a);
        }
    }
    function untrack(r, a) {
        if (a.idx >= 0) {
            const last = r.list.pop();
            if (last !== a) {
                r.list[a.idx] = last;
                last.idx = a.idx;
            }
            a.idx = -1;
        }
        if (a.pend) {
            a.pend = false;
            const i = r.pending.indexOf(a);
            if (i >= 0) r.pending.splice(i, 1);
        }
    }
    function stepObjects(layer) {
        if (!window.$gameMap) return;
        const r = registryOf(layer);
        for (let i = r.pending.length - 1; i >= 0; i--) {
            const a = r.pending[i];
            const info = objectInfo(a.type);
            if (info === undefined) continue; // its sidecar is still loading
            r.pending.splice(i, 1);
            a.pend = false;
            if (info) {
                a.info = info;
                a.fixed = info.fixed;
                a.idx = r.list.length;
                r.list.push(a);
            }
        }
        const list = r.list;
        if (!list.length) return;
        refreshIndex();
        const W = World();
        const area = W ? (W.viewLevel ? W.viewLevel() : W.currentArea()) : null;
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            // A loop that can't change state (sway or idle only) whose next column isn't due: nothing to do.
            if (a.on && a.fixed && ticks < a.next) continue;
            const sp = a.sprite;
            if (sp._ufType !== a.type || !sp._ufReady || !sp.bitmap) continue;
            const info = a.info;
            const cols = objectState(info, a, area, a.cell);
            if (!cols) {
                if (a.on) {
                    a.on = false;
                    a.state = "";
                    a.col = null;
                    const b = a.base;
                    if (b && !info.door) sp.setFrame(b.x, b.y, b.w, b.h); // doors: UF_Doors frames them every update
                }
                continue;
            }
            if (!a.on) {
                const f = a.frame;
                a.base = { x: f.x, y: f.y, w: f.width, h: f.height };
                a.on = true;
            }
            a.state = stName;
            const ft = info.frameTicks;
            const q = Math.floor((ticks + a.phase) / ft);
            const col = cols[q % cols.length];
            a.next = Math.ceil((q + 1) * ft - a.phase);
            const geo = objectGeo(info, sp.bitmap);
            if (geo && geo.grows && info.gx + col < info.gcols) sp.setFrame((info.gx + col) * info.gw, info.gy, info.gw, info.gh);
            a.col = col;
            a.tick = ticks;
        }
    }
    function wrapObjectLayer() {
        const O = Objects();
        const P = O && O.Sprite_Layer ? O.Sprite_Layer.prototype : null;
        if (!P || typeof P.update !== "function") return false;
        if (typeof P._assign === "function" && P._assign._ufAnim !== true) {
            // A pooled sprite given an object and a cell: what it played is forgotten (UF_Objects frames it afresh).
            const origAssign = P._assign;
            P._assign = markWrap(function(sp) {
                const r = origAssign.apply(this, arguments);
                try {
                    if (sp && this._ufAnimReg) track(this._ufAnimReg, sp);
                } catch (e) {
                    report("objects assign", e);
                }
                return r;
            }, origAssign);
        }
        if (typeof P._release === "function" && P._release._ufAnim !== true) {
            const origRelease = P._release;
            P._release = markWrap(function(sp) {
                const r = origRelease.apply(this, arguments);
                try {
                    if (sp && sp._ufA) {
                        if (this._ufAnimReg) untrack(this._ufAnimReg, sp._ufA);
                        sp._ufA.type = 0;
                        sp._ufA.on = false;
                    }
                } catch (e) {
                    report("objects release", e);
                }
                return r;
            }, origRelease);
        }
        if (P.update._ufAnim === true) return true;
        const orig = P.update;
        P.update = markWrap(function() {
            orig.apply(this, arguments);
            const t0 = performance.now();
            try {
                stepObjects(this);
            } catch (e) {
                report("objects", e);
            }
            const ms = performance.now() - t0;
            perf.objectMs += ms;
            frameMs += ms;
        }, orig);
        return true;
    }

    //-------------------------------------------------------------------------
    // Frame geometry for the death and remains sprites

    const shiftOf = name => (ImageManager.isObjectCharacter(name) ? 0 : 6); // Game_CharacterBase.shiftY
    function sheetRect(bitmap, name, index, col, dir, info) {
        const big = ImageManager.isBigCharacter(name);
        const rpw = bitmap.width / (big ? 3 : 12), rph = bitmap.height / (big ? 4 : 8);
        const pw = info && info.fw > 0 ? info.fw : rpw, ph = info && info.fh > 0 ? info.fh : rph;
        const bx = big ? 0 : (index % 4) * 3 * rpw, by = big ? 0 : Math.floor(index / 4) * 4 * rph;
        const row = info ? info.rows8[valid8(dir)] : (side4(dir) - 2) >> 1;
        const r = { x: bx + col * pw, y: by + row * ph, w: pw, h: ph };
        return r.x + r.w <= bitmap.width && r.y + r.h <= bitmap.height ? r : null;
    }
    // The sheet from ImageManager's cache when loaded there (units use it), else loaded outside that cache, so a sheet
    // that no longer exists (an art swap between a save and its load) leaves the remains invisible instead of stopping
    // the game with RMMZ's load error.
    const ownBitmaps = new Map();
    function remainsBitmap(name) {
        const url = "img/characters/" + Utils.encodeURI(name) + ".png";
        const cached = ImageManager._cache ? ImageManager._cache[url] : null;
        if (cached && cached.isReady() && !cached.isError()) return cached;
        let b = ownBitmaps.get(name);
        if (!b) {
            b = Bitmap.load(url);
            ownBitmaps.set(name, b);
        }
        return b;
    }

    //-------------------------------------------------------------------------
    // State (UF.World.state.anim, saved with the world) and game time

    let version = 0; // bumped whenever the remains list changes
    function animState() {
        const W = World();
        if (!W || !W.state) return null;
        let a = W.state.anim;
        if (!a || typeof a !== "object") a = W.state.anim = { remains: [] };
        if (!Array.isArray(a.remains)) a.remains = [];
        return a;
    }
    function remainsHours() {
        const c = window.$ufWorldCatalog && $ufWorldCatalog.anim;
        const h = c ? Number(c.remainsHours) : NaN;
        return h > 0 ? h : REMAINS_HOURS;
    }
    /** Game minutes since the calendar's start (UF_Core's clock: 12 months x 28 days); own saved counter without it. */
    function nowMinutes() {
        const t = window.$ufTime;
        if (t && Number.isFinite(t.hour) && Number.isFinite(t.day)) {
            return ((((t.year | 0) * 12 + (t.monthIndex | 0)) * 28 + ((t.day | 0) - 1)) * 24 + (t.hour | 0)) * 60 + (t.minute | 0);
        }
        const st = animState();
        return st ? st.clock | 0 : 0;
    }
    function addRemains(entry) {
        const st = animState();
        if (!st) return null;
        st.remains.push(entry);
        while (st.remains.length > REMAINS_CAP) st.remains.shift();
        version++;
        return entry;
    }
    function clearRemains(filter) {
        const st = animState();
        if (!st) return 0;
        const before = st.remains.length;
        st.remains = st.remains.filter(e => !(filter ? filter(e) : true));
        version++;
        return before - st.remains.length;
    }

    //-------------------------------------------------------------------------
    // Deaths

    const dying = new Set(); // unit ids being killed right now (inside a wrapped kill call)
    function isDeath(u) {
        if (!u) return false;
        if (dying.has(u.id)) return true;
        const d = u.data;
        return !!d && (d.dead === true || (typeof d.hp === "number" && d.hp <= 0));
    }
    function spritesetOf() {
        const s = SceneManager._scene;
        return s instanceof Scene_Map && s._spriteset ? s._spriteset : null;
    }
    function animLayer() {
        const ss = spritesetOf();
        return ss ? ss._ufAnim || null : null;
    }
    function spriteOfEvent(ev) {
        const ss = spritesetOf();
        return ev && ss && ss._characterSprites ? ss._characterSprites.find(s => s._character === ev) || null : null;
    }
    function spriteOfUnit(u) {
        const W = World();
        return W && u ? spriteOfEvent(W.eventOf(typeof u === "number" ? u : u.id)) : null;
    }

    let spritesetUpdating = false;
    /** Called just before a dying unit is removed: the sheet's death frames play and the last one stays as remains. */
    function onDeath(u) {
        const W = World();
        if (!W || !u || !u.image || !u.image.characterName) return null;
        stats.deaths++;
        shots.delete(u.id);
        const name = u.image.characterName;
        const info = unitInfo(name);
        const cols = info ? info.anims.death : null;
        if (!cols || !u.area || !W.isDisplayed(u)) {
            if (!cols) stats.deathsPlain++; // no death frames: the unit is simply removed and nothing stays
            emit("anim:death", u, null);
            return null;
        }
        const ev = W.eventOf(u.id);
        const entry = {
            area: u.area ? { x: u.area.x, y: u.area.y } : null,
            z: u.z !== undefined ? u.z : 0,
            x: ev ? ev.x : u.x,
            y: ev ? ev.y : u.y,
            image: name,
            index: u.image.characterIndex | 0,
            frame: cols[cols.length - 1],
            dir: ev ? dir8Of(ev) : valid8(u.dir8 || u.dir),
            until: nowMinutes() + Math.round(remainsHours() * 60)
        };
        if (u.data && u.data.tint) entry.tint = u.data.tint;
        addRemains(entry);
        const layer = animLayer();
        if (layer) {
            layer.queueGhost(entry);
            if (!spritesetUpdating) layer.update(); // drawn in this frame (the unit's own sprite goes now)
        }
        emit("anim:death", u, entry);
        return entry;
    }

    //-------------------------------------------------------------------------
    // The layer: pooled death and remains sprites in the tilemap (sorted with the characters by z), and the pool of
    // equipment layer sprites

    const view = { x0: 0, y0: 0, x1: 0, y1: 0 };
    function updateView() {
        view.x0 = Math.floor($gameMap.displayX()) - VIEW_MARGIN;
        view.y0 = Math.floor($gameMap.displayY()) - VIEW_MARGIN;
        view.x1 = view.x0 + Math.ceil($gameMap.screenTileX()) + 2 * VIEW_MARGIN;
        view.y1 = view.y0 + Math.ceil($gameMap.screenTileY()) + 2 * VIEW_MARGIN;
        return view;
    }
    const currentViewZ = () => {
        const W = World();
        const v = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        return v && v.z !== undefined ? v.z : 0;
    };
    const inView = e => (e.z === undefined || e.z === currentViewZ()) && e.x >= view.x0 && e.x <= view.x1 && e.y >= view.y0 && e.y <= view.y1;

    class AnimLayer {
        constructor(spriteset) {
            this._spriteset = spriteset;
            this._pool = [];
            this._kidPool = [];
            this._drawn = new Map();  // remains entry -> sprite
            this._ghosts = new Map(); // remains entry -> { start, length } (ticks)
            this._pending = [];
            this._top = new Map();    // cell key -> newest remains entry there that is not animating
            this._state = null;
            this._version = -1;
            this._stamp = 0;
        }
        tilemap() {
            return this._spriteset ? this._spriteset._tilemap : null;
        }
        activeCount() {
            return this._drawn.size;
        }
        poolSize() {
            return this._pool.length;
        }
        kidPoolSize() {
            return this._kidPool.length;
        }
        ghostCount() {
            return this._ghosts.size;
        }
        queueGhost(entry) {
            this._pending.push(entry);
        }

        update() {
            const t0 = performance.now();
            try {
                this.step();
            } catch (e) {
                report("layer", e);
            }
            const ms = performance.now() - t0;
            perf.layerMs += ms;
            frameMs += ms;
        }

        step() {
            const W = World();
            const st = animState();
            const curArea = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
            if (!this.tilemap() || !st || !window.$gameMap || !W || !curArea) {
                this.releaseAll();
                this._pending.length = 0;
                return;
            }
            if (st !== this._state) {
                // A loaded game (or a new world): draw from the new list.
                this.releaseAll();
                this._ghosts.clear();
                this._state = st;
                this._version = -1;
            }
            updateView();
            while (this._pending.length) this.startGhost(this._pending.shift());
            const now = nowMinutes();
            const list = st.remains;
            for (let i = list.length - 1; i >= 0; i--) {
                if (!(now < list[i].until)) {
                    this._ghosts.delete(list[i]);
                    list.splice(i, 1);
                    version++;
                }
            }
            this._ghosts.forEach((g, entry) => {
                if (ticks - g.start >= g.length) {
                    this._ghosts.delete(entry); // it lies still now
                    version++;
                }
            });
            if (this._version !== version) {
                this._version = version;
                this._top.clear();
                for (const e of list) if (!this._ghosts.has(e)) this._top.set(cellKey(e.x, e.y), e);
            }
            const stamp = ++this._stamp;
            for (const e of list) {
                const g = this._ghosts.get(e);
                if (!g && (this._top.get(cellKey(e.x, e.y)) !== e || !inView(e))) continue;
                let sp = this._drawn.get(e);
                if (!sp) {
                    sp = this.acquire();
                    this._drawn.set(e, sp);
                    sp._ufEntry = e;
                }
                sp._ufStamp = stamp;
                this.place(sp, e, g);
            }
            this._drawn.forEach((sp, e) => {
                if (sp._ufStamp !== stamp) {
                    this._drawn.delete(e);
                    this.release(sp);
                }
            });
        }

        startGhost(entry) {
            const info = unitInfo(entry.image);
            const cols = info ? info.anims.death : null;
            if (!cols || this._ghosts.size >= MAX_GHOSTS || !inView(entry)) return; // lies still at once
            this._ghosts.set(entry, { start: ticks, length: cols.length * info.frameTicks });
            stats.ghosts++;
            version++;
        }

        place(sp, e, g) {
            let bitmap;
            if (sp._ufImage === e.image && sp.bitmap) bitmap = sp.bitmap;
            else bitmap = remainsBitmap(e.image);
            if (sp.bitmap !== bitmap) sp.bitmap = bitmap;
            sp._ufImage = e.image;
            if (!bitmap || !bitmap.isReady()) {
                sp.visible = false;
                return;
            }
            const info = unitInfo(e.image);
            const cols = info ? info.anims.death : null;
            let col = e.frame;
            if (g && cols) col = cols[Math.min(cols.length - 1, Math.floor((ticks - g.start) / info.frameTicks))];
            const r = sheetRect(bitmap, e.image, e.index, col, e.dir, info);
            if (!r) {
                sp.visible = false;
                return;
            }
            sp.setFrame(r.x, r.y, r.w, r.h);
            sp._ufCol = col;
            const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
            const ay = $gameMap.adjustY(e.y);
            const footY = Math.round(ay * th + th);
            sp.x = Math.round(($gameMap.adjustX(e.x) + 0.5) * tw);
            sp.y = Math.round((ay + 1) * th - shiftOf(e.image));
            sp.z = g ? footY : footY - 2; // playing: at the unit's depth; lying: under items (-1) and units
            const tint = e.tint ? hexToInt(e.tint) : 0xffffff; // the species colour the unit had (a fixed tint)
            if (sp.tint !== tint) sp.tint = tint;
            sp.visible = true;
        }

        acquire() {
            let sp = this._pool.pop();
            if (!sp) {
                sp = new Sprite();
                sp._ufAnim = true;
                stats.created++;
            }
            sp.visible = false;
            sp.anchor.set(0.5, 1);
            this.tilemap().addChild(sp);
            return sp;
        }
        release(sp) {
            if (sp.parent) sp.parent.removeChild(sp);
            sp.visible = false;
            sp._ufEntry = null;
            sp._ufImage = null;
            sp.bitmap = null;
            if (this._pool.length < POOL_KEEP) this._pool.push(sp);
            else sp.destroy();
        }
        releaseAll() {
            for (const sp of this._drawn.values()) this.release(sp);
            this._drawn.clear();
        }
        acquireKid() {
            let s = this._kidPool.pop();
            if (!s) {
                s = new Sprite();
                s._ufAnimLayer = true;
                stats.layerSprites++;
            }
            s.visible = false;
            s.x = 0;
            s.y = 0;
            return s;
        }
        releaseKid(s) {
            if (!s) return;
            if (s.parent) s.parent.removeChild(s);
            s.visible = false;
            s.bitmap = null;
            if (this._kidPool.length < POOL_KEEP) this._kidPool.push(s);
            else s.destroy();
        }

        // Test and tool helpers (not used by the drawing itself)
        ghostAt(x, y) {
            let found = null;
            for (const [e, g] of this._ghosts) if (e.x === x && e.y === y) found = { entry: e, start: g.start, length: g.length, sprite: this._drawn.get(e) || null };
            return found;
        }
        spriteAt(x, y) {
            let found = null;
            for (const [e, sp] of this._drawn) {
                if (e.x !== x || e.y !== y) continue;
                if (!found || this._ghosts.has(e)) found = sp;
            }
            return found;
        }
        sprites() {
            return Array.from(this._drawn.values());
        }
    }

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufAnim = new AnimLayer(this);
        layerOwners.clear();
    };
    // After the tilemap and its children updated (the layer adds and removes tilemap children, which must not happen
    // while the tilemap walks its children).
    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        const tm = this._tilemap;
        if (tm) {
            cull.x1 = tm.width + CULL_PX;
            cull.y1 = tm.height + CULL_PX;
        }
        spritesetUpdating = true;
        try {
            _Spriteset_Map_update.call(this);
        } finally {
            spritesetUpdating = false;
        }
        const t0 = performance.now();
        try {
            stepUnits(this);
        } catch (e) {
            report("units", e);
        }
        const ms = performance.now() - t0;
        perf.unitMs += ms;
        frameMs += ms;
        if (this._ufAnim) this._ufAnim.update();
        perf.recent[perf.frames & 255] = frameMs; // the last 256 frames, for medians
        perf.frames++;
        perf.ms += frameMs;
        if (frameMs > perf.worst) perf.worst = frameMs;
        frameMs = 0;
    };

    //-------------------------------------------------------------------------
    // Work strokes: hunters working next to their prey and predators next to their target play their attack frames

    const adjacent = (a, b) => !!a && !!b && !!a.area && !!b.area && a.area.x === b.area.x && a.area.y === b.area.y &&
        Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;
    function isDangerous(u) {
        const d = u.data;
        if (!d) return false;
        if (Array.isArray(d.tags) && (d.tags.includes("predator") || d.tags.includes("monster"))) return true;
        const Wl = window.UF && UF.Wildlife;
        const sp = Wl && typeof Wl.speciesOf === "function" ? Wl.speciesOf(u) : null;
        return !!sp && (sp.kind === "predator" || sp.kind === "monster");
    }
    function targetOf(u) {
        const d = u.data;
        if (!d) return null;
        if (Number.isInteger(d.targetId)) return d.targetId;
        const it = d.intent;
        if (it && Number.isInteger(it.target)) return it.target;
        if (it && it.target && Number.isInteger(it.target.unitId)) return it.target.unitId;
        return null;
    }
    // Face the target (a choice of row) and play the attack frames.
    function strike(u, target) {
        const W = World();
        const ev = W ? W.eventOf(u.id) : null;
        if (!ev) return false;
        const dx = target.x - u.x, dy = target.y - u.y;
        if (!dx && !dy) return false;
        if (!ev.isDirectionFixed()) {
            if (ev.faceToward8) ev.faceToward8(dx, dy); // 8-way (VISION V3)
            else ev.setDirection(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8));
        }
        play(u, "attack");
        stats.strokes++;
        return true;
    }
    function stroke() {
        const W = World();
        const curArea = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        if (!W || !W.state || !spritesetOf() || !curArea) return 0;
        const J = Jobs();
        if (J && typeof J.handler === "function") wrapHunt(J.handler("hunt"));
        let n = 0;
        const js = W.state.jobs;
        const list = js && Array.isArray(js.list) ? js.list : [];
        for (const job of list) {
            if (!job || job.type !== "hunt" || job.state !== "work") continue;
            const hunter = W.unit(job.assigned), prey = job.params ? W.unit(job.params.unitId) : null;
            if (hunter && prey && W.isDisplayed(hunter) && adjacent(hunter, prey) && strike(hunter, prey)) n++;
        }
        const units = W.state.units || {};
        for (const id in units) {
            const u = units[id];
            const tid = targetOf(u);
            if (tid === null || !W.isDisplayed(u) || !isDangerous(u)) continue;
            const tg = W.unit(tid);
            if (tg && adjacent(u, tg) && strike(u, tg)) n++;
        }
        return n;
    }

    let lastBeat = -1;
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        ticks++;
        if (deathQueue.size) {
            const W = World();
            for (const id of Array.from(deathQueue)) {
                deathQueue.delete(id);
                if (!W || !W.unit(id)) continue;
                dying.add(id);
                try {
                    W.removeUnit(id);
                } catch (e) {
                    report("queued death", e);
                } finally {
                    dying.delete(id);
                }
            }
        }
        const B = window.UF && UF.Beat;
        let due;
        if (B && Number.isFinite(B.count)) {
            due = B.count !== lastBeat;
            lastBeat = B.count;
        } else {
            due = ticks % STROKE_TICKS === 0;
        }
        if (due) {
            const t0 = performance.now();
            try {
                stroke();
            } catch (e) {
                report("stroke", e);
            }
            perf.strokes++;
            perf.strokeMs += performance.now() - t0;
        }
        if (!window.$ufTime && ticks % 60 === 0) {
            const st = animState();
            if (st) st.clock = (st.clock | 0) + 1;
        }
    };

    //-------------------------------------------------------------------------
    // Runtime wraps of other plugins' public functions (their files are not edited)

    const installed = { removeUnit: false, onUnitDeath: false, playAttackAnimation: false, playHitAnimation: false, define: false, hunt: false, objectLayer: false, objectAssign: false };
    const isWrap = fn => typeof fn === "function" && fn._ufAnim === true;
    function markWrap(wrapped, orig) {
        wrapped._ufAnim = true;
        wrapped._ufOrig = orig;
        return wrapped;
    }
    function wrapHunt(h) {
        if (!h || typeof h.apply !== "function") return false;
        if (isWrap(h.apply)) return true;
        const orig = h.apply;
        h.apply = markWrap(function(job) {
            const preyId = job && job.params ? job.params.unitId : undefined;
            const flag = preyId !== undefined && preyId !== null && !dying.has(preyId);
            if (flag) dying.add(preyId);
            try {
                return orig.apply(this, arguments);
            } finally {
                if (flag) dying.delete(preyId);
            }
        }, orig);
        installed.hunt = true;
        return true;
    }
    const eventOfUnit = u => {
        const W = World();
        return W && u && u.id !== undefined ? W.eventOf(u.id) : null;
    };

    function install() {
        const W = World(), C = Combat(), J = Jobs();
        if (W && typeof W.removeUnit === "function" && !isWrap(W.removeUnit)) {
            const orig = W.removeUnit;
            W.removeUnit = markWrap(function(id) {
                const w = World();
                const u = w ? w.unit(id) : null;
                if (u && isDeath(u)) {
                    try {
                        onDeath(u);
                    } catch (e) {
                        report("onDeath", e);
                    }
                }
                const r = orig.apply(this && typeof this.unit === "function" ? this : w, arguments);
                if (u) {
                    shots.delete(u.id);
                    const sp = layerOwners.get(u.id);
                    if (sp) releaseLayers(sp);
                }
                return r;
            }, orig);
        }
        installed.removeUnit = !!W && isWrap(W.removeUnit);

        if (C && typeof C.onUnitDeath === "function" && !isWrap(C.onUnitDeath)) {
            const orig = C.onUnitDeath;
            C.onUnitDeath = markWrap(function(victim) {
                if (!victim || !victim.data || victim.id === undefined) return orig.apply(this, arguments);
                const id = victim.id, already = victim.data._isDying === true;
                dying.add(id);
                try {
                    return orig.apply(this, arguments);
                } finally {
                    const w = World();
                    if (!already && w && w.unit(id)) {
                        // UF_Combat would collapse the live sprite in code and remove the unit about 42 frames later;
                        // the death is the sheet's frames (V58), so its collapse is dropped and the removal happens now.
                        const ev = w.eventOf(id);
                        if (ev) {
                            ev._combatAnim = null;
                            ev._combatOffset = null;
                        }
                        try {
                            w.removeUnit(id);
                        } catch (e) {
                            report("onUnitDeath removal", e);
                        }
                    }
                    dying.delete(id);
                }
            }, orig);
        }
        installed.onUnitDeath = !!C && isWrap(C.onUnitDeath);

        if (C && typeof C.playAttackAnimation === "function" && !isWrap(C.playAttackAnimation)) {
            const orig = C.playAttackAnimation;
            C.playAttackAnimation = markWrap(function(attacker, target) {
                const fx = Array.isArray(C.effects) ? C.effects.length : -1;
                const r = orig.apply(this, arguments);
                try {
                    stats.combatAttacks++;
                    // UF_Combat turns the attacker in 4 directions; the attack frames face the target in 8 (VISION V3).
                    const ev = eventOfUnit(attacker);
                    if (ev && ev.faceToward8 && target && attacker && !ev.isDirectionFixed() && (target.x !== attacker.x || target.y !== attacker.y)) ev.faceToward8(target.x - attacker.x, target.y - attacker.y);
                    stopCombatMotion(eventOfUnit(attacker), COMBAT_ATTACK_TICKS);
                    // The strike mark it queued is a code-drawn slash or claw animation: dropped (V58: sprites only).
                    if (fx >= 0 && Array.isArray(C.effects) && C.effects.length > fx) {
                        stats.strikeMarksDropped += C.effects.length - fx;
                        C.effects.length = fx;
                    }
                    if (attacker) play(attacker, "attack");
                } catch (e) {
                    report("attack", e);
                }
                return r;
            }, orig);
        }
        installed.playAttackAnimation = !!C && isWrap(C.playAttackAnimation);

        if (C && typeof C.playHitAnimation === "function" && !isWrap(C.playHitAnimation)) {
            const orig = C.playHitAnimation;
            C.playHitAnimation = markWrap(function(target) {
                const r = orig.apply(this, arguments);
                try {
                    stats.combatHits++;
                    stopCombatMotion(eventOfUnit(target), COMBAT_HIT_TICKS);
                    if (target) play(target, "hurt");
                } catch (e) {
                    report("hurt", e);
                }
                return r;
            }, orig);
        }
        installed.playHitAnimation = !!C && isWrap(C.playHitAnimation);

        if (J && typeof J.define === "function" && !isWrap(J.define)) {
            const orig = J.define;
            J.define = markWrap(function(type) {
                const h = orig.apply(this, arguments);
                if (type === "hunt") wrapHunt(h || (typeof J.handler === "function" ? J.handler("hunt") : null));
                return h;
            }, orig);
        }
        installed.define = !!J && isWrap(J.define);
        if (J && typeof J.handler === "function") wrapHunt(J.handler("hunt"));
        installed.objectLayer = wrapObjectLayer();
        const LP = installed.objectLayer ? Objects().Sprite_Layer.prototype : null;
        installed.objectAssign = !!LP && isWrap(LP._assign) && isWrap(LP._release);
    }
    install(); // UF_Objects' layer class exists already (it loads first); everything again at boot and map start

    // Sidecars load by XHR, so ask for every unit image early: a death needs its answer at once.
    function requestSidecars() {
        const W = World();
        if (!W || !W.state) return;
        for (const u of W.units()) if (u.image && u.image.characterName) sidecar(u.image.characterName);
    }
    let hooked = false;
    function hookEvents() {
        if (hooked || !window.UF || !UF.Events || !UF.Events.on) return;
        hooked = true;
        UF.Events.on("world:unitAdded", u => { if (u && u.image) sidecar(u.image.characterName); });
        UF.Events.on("world:unitImageChanged", u => { if (u && u.image) sidecar(u.image.characterName); });
    }

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        install(); // idempotent: wraps again anything another plugin replaced after boot
        hookEvents();
        requestSidecars();
    };

    //-------------------------------------------------------------------------
    // The public object

    const resolveUnit = x => {
        const W = World();
        if (!W || x === null || x === undefined) return null;
        return typeof x === "number" ? W.unit(x) : x.id !== undefined ? W.unit(x.id) || null : null;
    };
    const Anim = {
        FRAME_MS, TICK_MS, REMAINS_CAP, MAX_GHOSTS, POOL_KEEP, STROKE_TICKS, LAYER_PREFIX, SLOTS, BEHIND, IGNORED_ANIMS,
        stats,
        perf,
        errors,
        installed,
        /** Map updates counted since boot: the animation clock (it stops while the game is paused). */
        clock: () => ticks,
        remainsHours,
        nowMinutes,
        isDeath,
        /** The image's sidecar (object), null when it has none, undefined while loading. */
        sidecar,
        /** Set (data) or drop (null) a sidecar in code; it wins over the file (tests, tools). */
        setSidecar(name, data) {
            if (data === null || data === undefined) overrides.delete(name);
            else overrides.set(name, data);
            forgetInfos();
        },
        /** The animations a unit or layer sheet names ({ stand, walk, work, attack, cast, hurt, death, idle }: column lists or null; carry always null, V89), or null. */
        animations(name) {
            const info = unitInfo(name);
            return info ? Object.assign({}, info.anims) : null;
        },
        deathColumns: name => {
            const info = unitInfo(name);
            return info ? info.anims.death : null;
        },
        /** Start a one-shot animation (attack, hurt, or any name the sheet lists) on a unit; true when its sheet has those frames. */
        play,
        /** What a unit's sprite showed at its last update: { want, shown, own, col, row, anim, k } or null. */
        frameOf(x) {
            const u = resolveUnit(x);
            const sp = u ? spriteOfUnit(u) : null;
            const pk = sp ? sp._ufPick : null;
            return pk && pk.unitId === u.id ? { want: pk.want, shown: pk.shown, own: pk.own, col: pk.col, row: pk.row, anim: pk.anim, k: pk.k } : null;
        },
        /** The equipment layer sprites on a unit: { list: [{ typeId, slot, behind, sprite }], over } (over: the body drawn again over layers behind it). */
        layersOf(x) {
            const u = resolveUnit(x);
            const sp = u ? spriteOfUnit(u) : null;
            const st = sp ? sp._ufLayers : null;
            return st ? { list: st.kids.map(k => ({ typeId: k.typeId, slot: k.slot, behind: k.behind, sprite: k.sprite })), over: st.over } : { list: [], over: null };
        },
        /** The layer sheet entry of an item type ({ typeId, name, url, bitmap }); its loading starts on the first call. */
        layerSheet,
        /** Forget the layer sheets looked up so far (a sheet added or replaced while the game runs; tests). */
        forgetLayers() {
            layerSheets.clear();
            forgetInfos();
        },
        /** The object sprite on a cell of the map on screen and what it plays: { sprite, state, col, phase, tick } or null. */
        objectAt(x, y) {
            const O = Objects();
            const s = O && O.spriteAt ? O.spriteAt(x, y) : null;
            const a = s ? s._ufA : null;
            return s ? { sprite: s, state: a && a.on ? a.state : "", col: a && a.on ? a.col : null, phase: a ? a.phase : 0, tick: a ? a.tick : -1 } : null;
        },
        /** The saved list (UF.World.state.anim.remains). */
        remains: () => {
            const st = animState();
            return st ? st.remains : [];
        },
        remainsAt: (x, y) => {
            const st = animState();
            return st ? st.remains.filter(e => e.x === x && e.y === y) : [];
        },
        addRemains,
        clearRemains,
        /** The layer of the map on screen, or null. */
        layer: animLayer,
        ghostAt(x, y) {
            const l = animLayer();
            return l ? l.ghostAt(x, y) : null;
        },
        spriteAt(x, y) {
            const l = animLayer();
            return l ? l.spriteAt(x, y) : null;
        },
        ghostCount() {
            const l = animLayer();
            return l ? l.ghostCount() : 0;
        },
        stroke,
        install,
        spriteOfUnit
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Anim = Anim;

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        install();
        hookEvents();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "anim"), registered at boot after all plugins load. Scratch sheets: made in memory
    // (ImageManager's cache and sidecars set in code) unless a file of that name exists in img/characters of the game
    // folder being tested (a snapshot prepared with them); never written anywhere.

    function registerChecks() {
        UF.Test.suite("anim", t => runChecks(t));
    }

    async function runChecks(t) {
        const W = UF.World, C = UF.Combat, J = UF.Jobs, I = UF.Items, O = UF.Objects;
        const area = W && W.currentArea();
        if (!area || !C || !J || !I || !O || !animLayer()) throw new Error(`not ready: area ${!!area}, UF.Combat ${!!C}, UF.Jobs ${!!J}, UF.Items ${!!I}, UF.Objects ${!!O}, layer ${!!animLayer()}`);
        const th = $gameMap.tileHeight();
        const FW = 48;
        const mid = W.state.size >> 1;
        const cat = window.$ufWorldCatalog || {};
        const species = (cat.wildlife && cat.wildlife.species) || [];
        const imageOf = id => (species.find(s => s.id === id) || {}).image || null;
        const anyImage = (species.find(s => s.image) || {}).image || "$Adam";
        const wolfImg = imageOf("wolf") || anyImage, deerImg = imageOf("deer") || anyImage;
        const people = cat.people && cat.people.human && Array.isArray(cat.people.human.images) ? cat.people.human.images : [];
        const personImg = people[0] || "$Adam";
        const made = new Set();
        const add = (name, image, x, y, dir, data) => {
            const u = W.addUnit({ name, image: { characterName: image, characterIndex: 0 }, area: { x: area.x, y: area.y }, x, y, dir: dir || 2, data: Object.assign({ kind: "test" }, data || {}) });
            made.add(u.id);
            return u;
        };
        const removeUnits = list => { for (const u of list) if (u && W.unit(u.id)) W.removeUnit(u.id); };
        const drawn = u => {
            const s = spriteOfUnit(u);
            return !!s && !!s.bitmap && s.bitmap.isReady() && s._frame.width > 0;
        };
        const colOf = s => (s ? Math.round(s._frame.x / FW) : -1);
        const rowOf = s => (s ? Math.round(s._frame.y / FW) : -1);
        const dedupe = a => a.filter((x, i) => i === 0 || x !== a[i - 1]);
        const runsOf = a => {
            const out = [];
            for (const x of a) {
                if (out.length && out[out.length - 1][0] === x) out[out.length - 1][1]++;
                else out.push([x, 1]);
            }
            return out;
        };
        const within = (a, set) => a.length > 0 && a.every(x => set.includes(x));
        const footRow = y => Math.round($gameMap.adjustY(y) * th + th);
        const errs0 = () => t.errorsSoFar().length + errors.length;
        const clockKeys = ["minute", "hour", "day", "monthIndex", "year"];
        const saveClock = () => (window.$ufTime ? clockKeys.reduce((o, k) => ((o[k] = $ufTime[k]), o), {}) : null);
        const restoreClock = c => { if (c) for (const k of clockKeys) $ufTime[k] = c[k]; };
        // Moves UF_Core's clock forward without its events (restored after each check).
        const advanceClock = minutes => {
            const c = $ufTime;
            const total = (c.minute | 0) + Math.max(0, Math.ceil(minutes));
            c.minute = total % 60;
            const h = (c.hour | 0) + Math.floor(total / 60);
            c.hour = h % 24;
            const d = (c.day | 0) - 1 + Math.floor(h / 24);
            c.day = (d % 28) + 1;
            const m = (c.monthIndex | 0) + Math.floor(d / 28);
            c.monthIndex = m % 12;
            c.year = (c.year | 0) + Math.floor(m / 12);
        };
        const expireAll = async () => {
            const list = Anim.remains();
            if (!list.length) return;
            const latest = Math.max(...list.map(e => e.until));
            advanceClock(latest - Anim.nowMinutes() + 1);
            await t.waitFrames(3);
        };
        const ourTilemapSprites = () => SceneManager._scene._spriteset._tilemap.children.filter(c => c._ufAnim === true).length;
        const clock0 = saveClock();
        const zoomLevel = UF.Camera ? UF.Camera.level() : 0;

        // --- Scratch sheets (AR-600 layout for bodies and layers; objects 3 x 4 of 48).
        let fs = null, pathMod = null, gameDir = "";
        try {
            fs = require("fs");
            pathMod = require("path");
            gameDir = pathMod.dirname(process.mainModule.filename);
        } catch (e) {
            fs = null;
        }
        const onDisk = (name, minCols = 0) => {
            try {
                if (!fs) return false;
                const file = pathMod.join(gameDir, "img", "characters", name + ".png");
                if (!fs.existsSync(file)) return false;
                if (minCols > 0) {
                    const fd = fs.openSync(file, "r");
                    const buf = Buffer.alloc(24);
                    fs.readSync(fd, buf, 0, 24, 0);
                    fs.closeSync(fd);
                    const w = buf.readUInt32BE(16);
                    if (w < minCols * FW) return false;
                }
                return true;
            } catch (e) {
                return false;
            }
        };
        const AR600 = { stand: [0], walk: [1, 2, 3], work: [4, 5, 6], carry: [7], attack: [8, 9, 10], cast: [11, 12, 13], hurt: [14], death: [15, 16, 17], idle: [18, 19] };
        const FACINGS = ["S", "W", "E", "N"];
        const BODY = "$TEST_AnimBody", PLAIN = "$TEST_AnimPlain", SWAY = "!$TEST_AnimSway", SHOP = "!$TEST_AnimShop", FIRE = "!$TEST_AnimFire";
        const AXE_ID = "stone_axe", AXE = LAYER_PREFIX + AXE_ID;
        const COLORS = ["#9aa0a6", "#3f7fd0", "#3f7fd0", "#3f7fd0", "#e08a1e", "#e08a1e", "#e08a1e", "#8a5a2b", "#d23c3c", "#d23c3c", "#d23c3c", "#8e44ad", "#8e44ad", "#8e44ad", "#ff7fbf", "#6b1010", "#6b1010", "#6b1010", "#2e9e4f", "#2e9e4f"];
        const ROWMARK = ["#ffffff", "#ffe082", "#80deea", "#202020"];
        const numbered = (b, cols, rows, draw) => {
            b.fontSize = 14;
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                draw(b, c * FW, r * FW, c, r);
                b.drawText(String(c), c * FW, r * FW + 18, FW, 18, "center");
            }
        };
        const sources = {};
        const memNames = [];
        const fixture = (name, cols, rows, draw, sc) => {
            if (onDisk(name, cols)) {
                sources[name] = "file";
                return;
            }
            const b = new Bitmap(cols * FW, rows * FW);
            numbered(b, cols, rows, draw);
            ImageManager._cache["img/characters/" + Utils.encodeURI(name) + ".png"] = b;
            Anim.setSidecar(name, sc);
            memNames.push(name);
            sources[name] = "memory";
        };
        const figure = (b, x, y, c, r) => {
            b.fillRect(x + 15, y + 10, 18, 36, COLORS[c % COLORS.length]);
            b.fillRect(x + 15, y + 10, 18, 4, ROWMARK[r]);
        };
        fixture(BODY, 20, 4, figure, { frameWidth: FW, frameHeight: FW, facings: FACINGS, animations: AR600, frameMs: 150, layer: "body" });
        fixture(PLAIN, 4, 4, figure, { frameWidth: FW, frameHeight: FW, facings: FACINGS, animations: { stand: [0], walk: [1, 2, 3] }, frameMs: 150 });
        fixture(AXE, 20, 4, (b, x, y) => {
            b.fillRect(x + 35, y + 14, 3, 24, "#6d4c2f");
            b.fillRect(x + 32, y + 12, 9, 7, "#c0c6cc");
        }, { frameWidth: FW, frameHeight: FW, facings: FACINGS, layer: "held" });
        fixture(SWAY, 3, 4, (b, x, y, c) => {
            b.fillRect(x + 22, y + 30, 5, 18, "#5d3a1a");
            b.fillRect(x + 10 + c * 3, y + 6, 26, 26, ["#2e7d32", "#388e3c", "#43a047"][c]);
        }, { frameWidth: FW, frameHeight: FW, facings: ["S"], animations: { stand: [0], sway: [0, 1, 2] }, frameMs: 150 });
        fixture(SHOP, 3, 4, (b, x, y, c) => {
            b.fillRect(x + 6, y + 26, 36, 14, "#8d6e63");
            if (c > 0) b.fillRect(x + 10 + (c - 1) * 14, y + 16, 10, 10, "#ffca28");
        }, { frameWidth: FW, frameHeight: FW, facings: ["S"], animations: { stand: [0], work: [1, 2] }, frameMs: 150 });
        fixture(FIRE, 3, 4, (b, x, y, c) => {
            b.fillRect(x + 12, y + 38, 24, 6, "#5d4037");
            if (c > 0) b.fillRect(x + 16 + (c - 1) * 4, y + 20 - (c - 1) * 4, 14, 18 + (c - 1) * 4, "#ff8f00");
        }, { frameWidth: FW, frameHeight: FW, facings: ["S"], animations: { stand: [0], lit: [1, 2] }, frameMs: 150 });
        Anim.forgetLayers();
        const scratchNames = [BODY, PLAIN, AXE, SWAY, SHOP, FIRE];
        // Files: wait for their sidecars (units and layers through UF_Anim, objects through UF.Sidecars).
        await t.waitUntil(() => [BODY, PLAIN, AXE].every(n => Anim.sidecar(n) !== undefined) &&
            [SWAY, SHOP, FIRE].every(n => objectSidecar(n) !== undefined), 5000, "the scratch sidecars").catch(() => {});
        const sourceNote = `scratch sheets: ${scratchNames.map(n => `${n} ${sources[n]}`).join(", ")}`;
        // Scratch object types, appended to the catalog list for the suite (type numbers of the real ones unchanged).
        const objectsBefore = cat.objects;
        cat.objects = objectsBefore.concat([
            { id: "TEST_anim_sway", name: "TEST sway", image: SWAY, passable: true, under: true, tags: ["test"] },
            { id: "TEST_anim_shop", name: "TEST shop", image: SHOP, passable: true, tags: ["test"] },
            { id: "TEST_anim_fire", name: "TEST fire", image: FIRE, passable: true, lit: true, tags: ["test"] }
        ]);
        const placed = new Map(); // cell key -> the type number that was there
        const put = (x, y, id) => {
            const k = cellKey(x, y);
            if (!placed.has(k)) placed.set(k, O.typeIdAt(x, y));
            O.set(x, y, id);
        };
        const restoreCells = () => {
            for (const [k, tid] of placed) O.set(k % 65536, Math.floor(k / 65536), tid || 0);
            placed.clear();
        };
        const testJobType = "test_anim_work";
        if (typeof J.handler !== "function" || !J.handler(testJobType)) {
            J.define(testJobType, { verb: "Testing", plan: () => ({ ok: true, stand: null }), work: 1e9, apply() {} });
        }
        const workJob = (u, x, y) => J.create({ type: testJobType, target: { area: { x: area.x, y: area.y }, x: x === undefined ? u.x : x, y: y === undefined ? u.y : y }, owner: u.id });

        // An arena: a free 10 x 5 block near the middle, in view at zoom 1.
        const free = (x, y) => W.cellFree(area.x, area.y, x, y);
        let arena = null;
        for (let r = 6; r <= 90 && !arena; r += 3) {
            for (let k = 0; k < 24 && !arena; k++) {
                const a = (k / 24) * Math.PI * 2;
                const x0 = Math.round(mid + Math.cos(a) * r) - 5, y0 = Math.round(mid + Math.sin(a) * r) - 2;
                let ok = x0 > 2 && y0 > 2 && x0 + 12 < W.state.size && y0 + 7 < W.state.size;
                for (let y = y0; y < y0 + 5 && ok; y++) for (let x = x0; x < x0 + 10 && ok; x++) if (!free(x, y)) ok = false;
                if (ok) arena = { x: x0, y: y0 };
            }
        }
        const arenaNote = arena ? `arena (${arena.x},${arena.y}) 10x5 free` : "no free 10x5 block: arena at the middle";
        if (!arena) arena = { x: mid - 5, y: mid + 6 };
        const ax = arena.x, ay = arena.y;
        const ensureView = (level = 0) => {
            const changed = UF.Camera ? UF.Camera.setLevel(level) : false;
            if (changed || $gameMap.displayX() !== ax + 5 - $gamePlayer.centerX() || $gameMap.displayY() !== ay + 2 - $gamePlayer.centerY()) $gamePlayer.locate(ax + 5, ay + 2);
        };
        ensureView();
        await t.waitFrames(10);

        try {
            // 1. no_code_motion: 300 frames of combat and hunting; the sprites keep their place, angle, size and colour.
            {
                const F = add("TEST_anim_fighter", BODY, ax + 1, ay + 1, 6, { hp: 9999, maxHp: 9999, species: "human" });
                const Wf = add("TEST_anim_wolf", wolfImg, ax + 2, ay + 1, 4, { hp: 9999, maxHp: 9999, species: "wolf", tags: ["predator"] });
                const G = add("TEST_anim_guard", personImg, ax + 1, ay + 2, 6, { hp: 9999, maxHp: 9999, species: "human" });
                const H = add("TEST_anim_hunter", BODY, ax + 5, ay + 3, 6, { workRate: 0.0005 });
                const P = add("TEST_anim_prey", deerImg, ax + 6, ay + 3, 4, { hp: 9999, maxHp: 9999 });
                Wf.data.targetId = F.id;
                const group = [F, Wf, G, H, P];
                await t.waitUntil(() => group.every(drawn), 8000, "the combat units to be drawn");
                const hunt = J.create({ type: "hunt", target: { area: { x: area.x, y: area.y }, x: P.x, y: P.y }, params: { unitId: P.id }, owner: H.id });
                await t.waitUntil(() => !!hunt && hunt.state === "work", 5000, "the hunter to start working").catch(() => {});
                const s0 = { a: stats.combatAttacks, h: stats.combatHits, st: stats.strokes, stop: stats.combatMotionStopped, fx: stats.strikeMarksDropped };
                const sigs = group.map(() => new Set());
                const colsSeen = group.map(() => new Set());
                let offsetFrames = 0, blendFrames = 0, shot = false;
                for (let f = 1; f <= 300; f++) {
                    if (f % 12 === 0) C.resolveAttack(F, Wf);
                    if (f % 12 === 6) C.resolveAttack(Wf, F);
                    if (f % 18 === 0) C.resolveAttack(G, Wf);
                    if (f % 20 === 0) C.playHitAnimation(F, Wf);
                    if (f % 25 === 0) C.playHitAnimation(Wf, G);
                    await t.waitFrames(1);
                    group.forEach((u, i) => {
                        const s = spriteOfUnit(u), ev = W.eventOf(u.id);
                        if (!s || !ev) {
                            sigs[i].add("missing");
                            return;
                        }
                        const bc = s.getBlendColor();
                        sigs[i].add([s.x - ev.screenX(), s.y - ev.screenY(), s.rotation, s.scale.x, s.scale.y, s.skew.x, s.skew.y, s.filters ? s.filters.length : 0, bc.join("/"), s.opacity, s.anchor.x, s.anchor.y].join(","));
                        colsSeen[i].add(colOf(s));
                        if (ev._combatOffset) offsetFrames++;
                        if (bc[3] > 0) blendFrames++;
                    });
                    if (f === 150) {
                        ensureView();
                        shot = true;
                        t.screenshot("no_code_motion"); // 6 frames after F's attack: UF_Combat's lunge would be at its 18 px peak
                    }
                }
                const d = { a: stats.combatAttacks - s0.a, h: stats.combatHits - s0.h, st: stats.strokes - s0.st, stop: stats.combatMotionStopped - s0.stop, fx: stats.strikeMarksDropped - s0.fx };
                const fCols = Array.from(colsSeen[0]).sort((a, b) => a - b), hCols = Array.from(colsSeen[3]).sort((a, b) => a - b);
                const framesPlayed = [8, 14].every(c => colsSeen[0].has(c)) && [8, 9, 10].every(c => colsSeen[3].has(c)) && [4, 5, 6].some(c => colsSeen[3].has(c));
                const still = sigs.every(s => s.size === 1 && !s.has("missing"));
                const huntState = hunt ? hunt.state : "none";
                if (hunt) J.cancel(hunt.id, "test over");
                t.check("no_code_motion",
                    still && offsetFrames === 0 && blendFrames === 0 && d.a >= 40 && d.h >= 20 && d.st >= 5 && framesPlayed && shot,
                    `${arenaNote}; ${sourceNote}; 300 frames: ${d.a} UF_Combat attacks, ${d.h} hits, ${d.st} work strokes (hunt ${huntState}), ${d.stop} UF_Combat motions stopped, ${d.fx} strike marks dropped; ` +
                    `distinct (offset from the cell, rotation, scale, skew, filters, blend colour, opacity, anchor) per unit: ${group.map((u, i) => `${u.name} ${sigs[i].size}${sigs[i].size > 1 ? ` [${Array.from(sigs[i]).slice(0, 3).join(" | ")}]` : ""}`).join(", ")} (want 1 each); ` +
                    `frames with a UF_Combat offset set ${offsetFrames}, with a blend colour ${blendFrames} (want 0); columns shown: fighter ${fCols.join(",")}, hunter ${hCols.join(",")} (want 8 (its attacks start; a hit every 6 frames cuts them short) and 14 for the fighter, 8-10 and work 4-6 for the hunter)`);
                removeUnits(group);
                await t.waitFrames(2);
            }

            // 2. death_frames_and_remains: the death columns play in order and the last lies as remains; a sheet
            // without death frames leaves nothing.
            let deathEntry = null, deathCell = null, killedAt = 0;
            {
                const killer = add("TEST_anim_killer", personImg, ax + 4, ay + 1, 4, { hp: 50, maxHp: 50 });
                const D1 = add("TEST_anim_dies", BODY, ax + 3, ay + 1, 4, { hp: 5, maxHp: 5 });
                const D2 = add("TEST_anim_dies_plain", wolfImg, ax + 7, ay + 1, 2, { hp: 5, maxHp: 5, species: "wolf" });
                await t.waitUntil(() => [killer, D1, D2].every(drawn), 8000, "the dying units to be drawn");
                await t.waitFrames(2);
                const d1s = spriteOfUnit(D1);
                const unitZ = d1s.z;
                deathCell = { x: D1.x, y: D1.y };
                const plain0 = stats.deathsPlain;
                C.onUnitDeath(D1, killer);
                killedAt = Anim.nowMinutes();
                const goneAtOnce = !W.unit(D1.id);
                deathEntry = Anim.remainsAt(deathCell.x, deathCell.y).slice(-1)[0] || null;
                const seq = [], rows = [], zs = [], bad = [];
                let midShot = false;
                for (let f = 1; f <= 40; f++) {
                    const g = Anim.ghostAt(deathCell.x, deathCell.y), s = Anim.spriteAt(deathCell.x, deathCell.y);
                    if (g && s) {
                        seq.push(colOf(s));
                        rows.push(rowOf(s));
                        zs.push(s.z);
                        if (s.rotation !== 0 || s.scale.x !== 1 || s.scale.y !== 1 || s.alpha !== 1 || (s.filters && s.filters.length)) bad.push(f);
                        if (!midShot && colOf(s) === 16) {
                            ensureView();
                            t.screenshot("death_frames");
                            midShot = true;
                        }
                    }
                    await t.waitFrames(1);
                }
                const lying = Anim.spriteAt(deathCell.x, deathCell.y);
                const lyingOk = !!lying && lying.visible && colOf(lying) === 17 && rowOf(lying) === 1 && lying.z === footRow(deathCell.y) - 2 && lying.rotation === 0 && lying.alpha === 1 && !(lying.filters && lying.filters.length) && lying.tint === 0xffffff;
                const r = runsOf(seq);
                const orderOk = dedupe(seq).join() === "15,16,17" && r.every(([, n]) => n >= 8 && n <= 10) && dedupe(rows).join() === "1" && zs.every(z => z === unitZ) && bad.length === 0;
                // A sheet without death frames: removed, nothing stays.
                C.onUnitDeath(D2, killer);
                const d2Gone = !W.unit(D2.id);
                await t.waitFrames(20);
                const d2Left = Anim.remainsAt(D2.x, D2.y).length, d2Sprite = !!Anim.spriteAt(D2.x, D2.y);
                // The hunt job's kill goes the same way.
                const prey = add("TEST_anim_prey_dies", BODY, ax + 2, ay + 3, 2, {});
                const hunter = add("TEST_anim_hunter_kills", personImg, ax + 3, ay + 3, 4, { workRate: 1 });
                await t.waitUntil(() => drawn(prey) && drawn(hunter), 8000, "the hunt pair to be drawn");
                const px = prey.x, py = prey.y;
                const hj = J.create({ type: "hunt", target: { area: { x: area.x, y: area.y }, x: px, y: py }, params: { unitId: prey.id }, owner: hunter.id });
                const hseq = [];
                await t.waitUntil(() => {
                    const s = Anim.ghostAt(px, py) ? Anim.spriteAt(px, py) : null;
                    if (s) hseq.push(colOf(s));
                    return !hj || hj.state === "done" || hj.state === "failed";
                }, 10000, "the hunt to end").catch(() => {});
                for (let f = 0; f < 35; f++) {
                    const s = Anim.ghostAt(px, py) ? Anim.spriteAt(px, py) : null;
                    if (s) hseq.push(colOf(s));
                    await t.waitFrames(1);
                }
                const hRem = Anim.remainsAt(px, py);
                const hLying = Anim.spriteAt(px, py);
                const huntOk = !!hj && hj.state === "done" && !W.unit(prey.id) && dedupe(hseq).join() === "15,16,17" && hRem.length === 1 && hRem[0].frame === 17 && !!hLying && colOf(hLying) === 17;
                ensureView();
                await t.waitFrames(1);
                t.screenshot("remains");
                t.check("death_frames_and_remains",
                    goneAtOnce && !!deathEntry && deathEntry.frame === 17 && orderOk && lyingOk && d2Gone && d2Left === 0 && !d2Sprite && stats.deathsPlain - plain0 === 1 && huntOk,
                    `sheet with death frames (${BODY}, facing W): removed at once ${goneAtOnce}; columns shown ${r.map(([c, n]) => `${c}x${n}`).join(" ") || "none"} (want 15, 16, 17 for 8-10 frames each) in row(s) ${dedupe(rows).join(",")} (want 1), z ${dedupe(zs).join(",")} (the unit's ${unitZ}); frames rotated, scaled, faded or filtered: ${bad.length}; ` +
                    `remains entry ${deathEntry ? JSON.stringify(deathEntry) : "MISSING"}; lying sprite ${lying ? `column ${colOf(lying)} row ${rowOf(lying)}, z ${lying.z} (want ${footRow(deathCell.y) - 2}), rotation ${lying.rotation}, alpha ${lying.alpha}, tint 0x${lying.tint.toString(16)}` : "none"}; ` +
                    `sheet without death frames (${wolfImg}): removed ${d2Gone}, remains there ${d2Left}, sprite there ${d2Sprite} (want 0 / false), plain deaths +${stats.deathsPlain - plain0}; ` +
                    `hunt kill #${hj ? hj.id : "?"} ${hj ? hj.state : "not created"}: prey gone ${!W.unit(prey.id)}, columns ${dedupe(hseq).join(",") || "none"}, remains ${hRem.length} (frame ${hRem[0] ? hRem[0].frame : "-"}), lying column ${hLying ? colOf(hLying) : "none"}`);
                removeUnits([killer, hunter]);
                Anim.clearRemains(e => e.x === px && e.y === py);
                await t.waitFrames(2);
            }

            // 3. state_frames: work, attack, hurt, idle (and cast, and the pause) take their columns from the sidecar.
            // (No carry: VISION V89. A hauler is checked by no_carry_pose.)
            {
                const Wk = add("TEST_anim_worker", BODY, ax + 0, ay + 0, 2, {});
                const A = add("TEST_anim_attacker", BODY, ax + 6, ay + 1, 6, { hp: 99, maxHp: 99 });
                const B = add("TEST_anim_target", BODY, ax + 7, ay + 1, 4, { hp: 99, maxHp: 99 });
                const Id = add("TEST_anim_idler", BODY, ax + 9, ay + 2, 2, {});
                const Cs = add("TEST_anim_caster", BODY, ax + 9, ay + 0, 2, { casting: true });
                const units = [Wk, A, B, Id, Cs];
                await t.waitUntil(() => units.every(drawn), 8000, "the state units to be drawn");
                const wj = workJob(Wk);
                await t.waitUntil(() => !!wj && wj.state === "work", 3000, "the worker to work").catch(() => {});
                const seen = { work: [], idle: [], cast: [], attack: [], hurt: [] };
                const wants = { work: new Set(), idle: new Set(), cast: new Set() };
                C.playAttackAnimation(A, B);
                C.playHitAnimation(B, A);
                let stShot = false;
                for (let f = 1; f <= 45; f++) {
                    await t.waitFrames(1);
                    seen.work.push(colOf(spriteOfUnit(Wk)));
                    seen.idle.push(colOf(spriteOfUnit(Id)));
                    seen.cast.push(colOf(spriteOfUnit(Cs)));
                    seen.attack.push([colOf(spriteOfUnit(A)), rowOf(spriteOfUnit(A))]);
                    seen.hurt.push([colOf(spriteOfUnit(B)), rowOf(spriteOfUnit(B))]);
                    for (const [k, u] of [["work", Wk], ["idle", Id], ["cast", Cs]]) {
                        const fo = Anim.frameOf(u);
                        if (fo) wants[k].add(fo.want);
                    }
                    if (f === 13 && !stShot) {
                        ensureView();
                        t.screenshot("state_frames");
                        stShot = true;
                    }
                }
                const atkCols = seen.attack.map(p => p[0]), atkRuns = runsOf(atkCols);
                const atkLen = atkRuns.slice(0, 3).reduce((n, r) => n + r[1], 0);
                const attackOk = atkRuns.length >= 4 && atkRuns[0][0] === 8 && atkRuns[1][0] === 9 && atkRuns[2][0] === 10 && atkRuns.slice(0, 3).every(([, n]) => n >= 8 && n <= 10) &&
                    seen.attack.slice(0, atkLen).every(p => p[1] === 2) && atkRuns.slice(3).every(([c]) => c === 18 || c === 19);
                const hurtRun = runsOf(seen.hurt.map(p => p[0]));
                const hurtOk = hurtRun.length >= 2 && hurtRun[0][0] === 14 && hurtRun[0][1] >= 8 && hurtRun[0][1] <= 10 && seen.hurt[0][1] === 1 && seen.hurt.slice(hurtRun[0][1]).every(p => p[0] === 18 || p[0] === 19);
                const workOk = within(seen.work, [4, 5, 6]) && [4, 5, 6].every(c => seen.work.includes(c)) && wants.work.has("work") && wants.work.size === 1;
                const idleOk = within(seen.idle, [18, 19]) && seen.idle.includes(18) && seen.idle.includes(19) && wants.idle.has("idle");
                const castOk = within(seen.cast, [11, 12, 13]) && [11, 12, 13].every(c => seen.cast.includes(c));
                // Paused: the frames stand still with the game.
                let pauseOk = null, pauseCols = [];
                if (UF.Time && typeof UF.Time.pause === "function") {
                    const c0 = Anim.clock();
                    UF.Time.pause();
                    for (let f = 0; f < 30; f++) {
                        await t.waitFrames(1);
                        pauseCols.push(colOf(spriteOfUnit(Id)));
                    }
                    const c1 = Anim.clock();
                    UF.Time.resume();
                    pauseOk = dedupe(pauseCols).length === 1 && c1 === c0;
                }
                if (wj) J.cancel(wj.id, "test over");
                t.check("state_frames",
                    workOk && attackOk && hurtOk && idleOk && castOk && pauseOk !== false,
                    `work: ${dedupe(seen.work).slice(0, 12).join(",")} (want 4-6 cycling; state ${Array.from(wants.work).join("/")}); ` +
                    `attack: ${atkRuns.map(([c, n]) => `${c}x${n}`).join(" ")} in row ${dedupe(seen.attack.slice(0, atkLen).map(p => p[1])).join(",")} (want 8, 9, 10 for 8-10 frames each in row 2, then idle 18/19); hurt: ${hurtRun.map(([c, n]) => `${c}x${n}`).join(" ")} (want 14 for 8-10 frames in row 1, then idle); ` +
                    `idle: ${dedupe(seen.idle).slice(0, 10).join(",")} (want 18/19); cast: ${dedupe(seen.cast).slice(0, 10).join(",")} (want 11-13); paused 30 frames: columns ${dedupe(pauseCols).join(",") || "n/a"}, clock ${pauseOk === null ? "no UF.Time" : pauseOk ? "stopped" : "MOVED"}`);
                removeUnits(units);
                await t.waitFrames(2);
            }

            // 3b. no_carry_pose (VISION V89, user 2026-09-19: carried loads are not drawn): a real haul job. The hauler walks to
            // a stack of 3 logs, picks it up, carries it 6 cells east and puts it down. While it holds the logs it shows the walk
            // columns 1-3 while it moves and the stand column 0 while it is still: never the carry column 7 (which the scratch
            // sheet has and its sidecar names), never the state "carry". A carry one-shot plays nothing.
            {
                const Hl = add("TEST_anim_hauler", BODY, ax + 0, ay + 4, 6, { inventory: [] });
                await t.waitUntil(() => drawn(Hl), 8000, "the hauler to be drawn");
                const loadType = I.type("log") ? "log" : "stone";
                const here = { x: area.x, y: area.y };
                const from = { x: ax + 2, y: ay + 4 }, to = { x: ax + 8, y: ay + 4 };
                const atTo0 = I.count({ area: here, x: to.x, y: to.y }, loadType);
                const pile = I.drop(here, from.x, from.y, loadType, 3)[0] || null;
                const hj = pile ? J.create({ type: "haul", target: { area: here, x: from.x, y: from.y }, params: { itemId: pile.id, to: { area: here, x: to.x, y: to.y } }, owner: Hl.id }) : null;
                let heldFrames = 0, walkFrames = 0, standFrames = 0, movingFrames = 0, mismatch = 0, shotTaken = false;
                const heldCols = new Set(), heldWants = new Set(), bad = [];
                for (let f = 1; f <= 1500; f++) {
                    await t.waitFrames(1);
                    const it = pile ? I.get(pile.id) : null;
                    const s = spriteOfUnit(Hl), ev = W.eventOf(Hl.id), fo = Anim.frameOf(Hl);
                    if (it && it.holder === Hl.id && s && ev && fo) {
                        heldFrames++;
                        const c = colOf(s);
                        heldCols.add(c);
                        heldWants.add(fo.want);
                        if (ev.isMoving()) movingFrames++;
                        if (c !== fo.col) mismatch++;
                        if (fo.want === "walk") {
                            walkFrames++;
                            if (c < 1 || c > 3) bad.push(`walk on column ${c}`);
                        } else if (fo.want === "stand") {
                            standFrames++;
                            if (c !== 0) bad.push(`stand on column ${c}`);
                        } else bad.push(`${fo.want} on column ${c}`);
                        if (!shotTaken && fo.want === "walk" && walkFrames >= 12) {
                            ensureView();
                            t.screenshot("no_carry_pose"); // the hauler mid-walk with the logs: its walk frame, no load drawn
                            shotTaken = true;
                        }
                    }
                    if (!hj || hj.state === "done" || hj.state === "failed" || hj.state === "cancelled") break;
                }
                const arrived = I.count({ area: here, x: to.x, y: to.y }, loadType) - atTo0;
                const playRet = Anim.play(Hl, "carry");
                const afterCols = new Set(), afterWants = new Set();
                for (let f = 0; f < 20; f++) {
                    await t.waitFrames(1);
                    const s = spriteOfUnit(Hl), fo = Anim.frameOf(Hl);
                    if (s) afterCols.add(colOf(s));
                    if (fo) afterWants.add(fo.want);
                }
                const sideCarry = (Anim.animations(BODY) || {}).carry;
                const sorted = set => Array.from(set).sort((a, b) => a - b).join(",");
                t.check("no_carry_pose",
                    !!hj && hj.state === "done" && arrived === 3 && heldFrames >= 20 && walkFrames >= 10 && [1, 2, 3].every(c => heldCols.has(c)) && !heldCols.has(7) &&
                    !heldWants.has("carry") && bad.length === 0 && mismatch === 0 && playRet === false && !afterCols.has(7) && !afterWants.has("carry") && sideCarry === null && shotTaken,
                    `${BODY} (carry column 7 on the sheet, named in its sidecar) hauling 3 ${loadType} from (${from.x},${from.y}) to (${to.x},${to.y}): haul #${hj ? hj.id : "?"} ${hj ? hj.state : "not created"}, ${arrived} arrived (want 3); ` +
                    `while holding them ${heldFrames} frames (${movingFrames} moving): states ${Array.from(heldWants).join("/") || "none"} (walk ${walkFrames}, stand ${standFrames}; want walk and stand only), columns ${sorted(heldCols) || "none"} (want 1-3 walking, 0 still, never 7); ` +
                    `wrong frames ${bad.length}${bad.length ? ` [${bad.slice(0, 4).join("; ")}]` : ""}, sprite frame not the chosen column ${mismatch}; ` +
                    `play(hauler, "carry") -> ${playRet} (want false), then columns ${sorted(afterCols)} and states ${Array.from(afterWants).join("/")} (want no 7, no carry); sidecar carry list read as ${JSON.stringify(sideCarry)} (want null)`);
                if (hj && (hj.state === "open" || hj.state === "travel" || hj.state === "work")) J.cancel(hj.id, "test over");
                removeUnits([Hl]);
                for (const it of I.atIn(here, to.x, to.y).concat(I.atIn(here, from.x, from.y))) if (it.type === loadType) I.remove(it.id);
                await t.waitFrames(2);
            }

            // 4. missing_frames_plain: a sheet without those columns shows its stand or walk frames.
            {
                let rmmzImg = null;
                for (const img of [personImg, wolfImg, deerImg, "$Adam"]) {
                    const a = Anim.animations(img);
                    if (!a || !["work", "carry", "attack", "hurt", "idle", "cast", "death"].some(k => a[k])) {
                        rmmzImg = img;
                        break;
                    }
                }
                const Pw = add("TEST_anim_plain_worker", PLAIN, ax + 0, ay + 0, 2, {});
                const Pa = add("TEST_anim_plain_attacker", PLAIN, ax + 3, ay + 1, 6, { hp: 99, maxHp: 99 });
                const Pb = add("TEST_anim_plain_target", PLAIN, ax + 4, ay + 1, 4, { hp: 99, maxHp: 99 });
                const Pi = add("TEST_anim_plain_idler", PLAIN, ax + 8, ay + 0, 2, {});
                const Pc = add("TEST_anim_plain_carrier", PLAIN, ax + 0, ay + 4, 6, { inventory: [] });
                const Ra = add("TEST_anim_rmmz_attacker", rmmzImg || "$Adam", ax + 6, ay + 2, 6, { hp: 99, maxHp: 99 });
                const Rb = add("TEST_anim_rmmz_target", rmmzImg || "$Adam", ax + 7, ay + 2, 4, { hp: 99, maxHp: 99 });
                const units = [Pw, Pa, Pb, Pi, Pc, Ra, Rb];
                await t.waitUntil(() => units.every(drawn), 8000, "the plain units to be drawn");
                const wj = workJob(Pw);
                const stone = I.give("stone", 1, Pc.id)[0];
                const cj = stone ? J.create({ type: "haul", target: { area: { x: area.x, y: area.y }, x: Pc.x, y: Pc.y }, params: { itemId: stone.id, to: { area: { x: area.x, y: area.y }, x: Pc.x + 6, y: Pc.y } }, owner: Pc.id }) : null;
                await t.waitUntil(() => !!wj && wj.state === "work", 3000, "the plain worker to work").catch(() => {});
                C.playAttackAnimation(Pa, Pb);
                C.playHitAnimation(Pb, Pa);
                C.playAttackAnimation(Ra, Rb);
                C.playHitAnimation(Rb, Ra);
                const seen = { work: [], attack: [], hurt: [], idle: [], carry: [] };
                const states = { work: new Set(), attack: new Set(), hurt: new Set(), carry: new Set() };
                let rmmzBad = 0, rmmzOwn = 0, rmmzN = 0;
                for (let f = 1; f <= 40; f++) {
                    await t.waitFrames(1);
                    seen.work.push(colOf(spriteOfUnit(Pw)));
                    seen.attack.push(colOf(spriteOfUnit(Pa)));
                    seen.hurt.push(colOf(spriteOfUnit(Pb)));
                    seen.idle.push(colOf(spriteOfUnit(Pi)));
                    if (cj && (cj.state === "travel" || cj.state === "work")) seen.carry.push(colOf(spriteOfUnit(Pc)));
                    const add2 = (k, u) => { const fo = Anim.frameOf(u); if (fo) states[k].add(`${fo.want}>${fo.shown}`); };
                    add2("work", Pw);
                    if (f <= 20) {
                        add2("attack", Pa);
                        add2("hurt", Pb);
                    }
                    add2("carry", Pc);
                    for (const u of [Ra, Rb]) {
                        const s = spriteOfUnit(u), fo = Anim.frameOf(u);
                        if (!s || !fo) continue;
                        rmmzN++;
                        if (fo.own) rmmzOwn++;
                        if (s._frame.x !== (s.characterBlockX() + s.characterPatternX()) * s.patternWidth() || s._frame.y !== (s.characterBlockY() + s.characterPatternY()) * s.patternHeight()) rmmzBad++;
                    }
                }
                if (wj) J.cancel(wj.id, "test over");
                if (cj && (cj.state === "travel" || cj.state === "work")) J.cancel(cj.id, "test over");
                const plainOk = within(seen.work, [0, 1, 2, 3]) && within(seen.attack, [0]) && within(seen.hurt, [0]) && within(seen.idle, [0]) && (seen.carry.length === 0 || within(seen.carry, [0, 1, 2, 3])) && seen.carry.some(c => c >= 1);
                const stateOk = states.work.has("work>walk") && states.attack.has("attack>stand") && states.hurt.has("hurt>stand");
                t.check("missing_frames_plain",
                    plainOk && stateOk && rmmzN > 0 && rmmzOwn === 0 && rmmzBad === 0 && !!rmmzImg,
                    `${PLAIN} (stand 0, walk 1-3 only): work ${dedupe(seen.work).join(",")} (${Array.from(states.work).join(" ")}), attack ${dedupe(seen.attack).join(",")} (${Array.from(states.attack).join(" ")}), hurt ${dedupe(seen.hurt).join(",")} (${Array.from(states.hurt).join(" ")}), idle ${dedupe(seen.idle).join(",")}, hauling (item held) ${dedupe(seen.carry).join(",") || "none"} (${Array.from(states.carry).join(" ")}) (want only 0-3: stand or walk); ` +
                    `RPG Maker sheet ${rmmzImg || "NONE FOUND"} attacking and hurt: ${rmmzOwn} of ${rmmzN} frames set by UF_Anim (want 0), ${rmmzBad} frames off RPG Maker's own pattern frame (want 0)`);
                removeUnits(units);
                await t.waitFrames(2);
            }

            // 5. object_frames: sway steps with a phase per cell; a busy workshop works, a lit fire burns; a pooled
            // sprite given a rock stops.
            {
                const swayCells = [];
                for (let i = 0; i < 8; i++) swayCells.push({ x: ax + 1 + i, y: ay });
                for (const c of swayCells) put(c.x, c.y, "TEST_anim_sway");
                const shop = { x: ax + 2, y: ay + 2 }, fire = { x: ax + 6, y: ay + 2 };
                put(shop.x, shop.y, "TEST_anim_shop");
                put(fire.x, fire.y, "TEST_anim_fire");
                const worker = add("TEST_anim_shop_worker", personImg, shop.x, shop.y + 1, 8, {});
                const ready = c => { const s = O.spriteAt(c.x, c.y); return !!s && s._ufReady && s.visible; };
                await t.waitUntil(() => swayCells.every(ready) && ready(shop) && ready(fire) && drawn(worker), 8000, "the scratch objects to be drawn");
                await t.waitFrames(2);
                const shopBase = { x: O.spriteAt(shop.x, shop.y)._frame.x, y: O.spriteAt(shop.x, shop.y)._frame.y };
                const sj = workJob(worker, shop.x, shop.y);
                await t.waitUntil(() => !!sj && sj.state === "work", 3000, "the shop worker to work").catch(() => {});
                const seqs = swayCells.map(() => []);
                let mismatch = 0, unison = 0;
                const shopCols = [], fireCols = [], shopStates = new Set(), fireStates = new Set();
                for (let f = 1; f <= 45; f++) {
                    await t.waitFrames(1);
                    const now = [];
                    swayCells.forEach((c, i) => {
                        const o = Anim.objectAt(c.x, c.y);
                        const col = o ? colOf(o.sprite) : -1;
                        seqs[i].push(col);
                        now.push(col);
                        // RMMZ updates the sprites before $gameMap, so a frame shows the previous map update's column.
                        const want = o ? [0, 1, 2][Math.floor((Anim.clock() - 1 + o.phase) / 9) % 3] : -2;
                        if (col !== want || !o || o.state !== "sway") mismatch++;
                    });
                    if (now.every(c => c === now[0])) unison++;
                    const so = Anim.objectAt(shop.x, shop.y), fo = Anim.objectAt(fire.x, fire.y);
                    shopCols.push(so ? colOf(so.sprite) : -1);
                    fireCols.push(fo ? colOf(fo.sprite) : -1);
                    if (so) shopStates.add(so.state);
                    if (fo) fireStates.add(fo.state);
                    if (f === 20) {
                        ensureView();
                        t.screenshot("object_frames");
                    }
                }
                const phases = new Set(swayCells.map(c => { const o = Anim.objectAt(c.x, c.y); return o ? o.phase % 27 : -1; }));
                const swayOk = seqs.every(s => [0, 1, 2].every(c => s.includes(c)) && dedupe(s).length >= 4) && mismatch === 0 && unison < 45 && phases.size >= 2;
                const shopOk = within(shopCols, [1, 2]) && shopCols.includes(1) && shopCols.includes(2) && shopStates.size === 1 && shopStates.has("work");
                const fireOk = within(fireCols, [1, 2]) && fireCols.includes(1) && fireCols.includes(2) && fireStates.has("lit");
                // The workshop stops when its job does.
                if (sj) J.cancel(sj.id, "test over");
                await t.waitFrames(3);
                const so2 = Anim.objectAt(shop.x, shop.y);
                const shopBack = !!so2 && so2.state === "" && so2.sprite._frame.x === shopBase.x && so2.sprite._frame.y === shopBase.y;
                // A pooled sprite reassigned to a rock stops.
                const plainThing = ty => (ty.image || ty.tile) && !ty.gen && !(ty.tags || []).some(g => g === "wall" || g === "door" || g === "building" || g === "workplace");
                const rock = (O.types().find(ty => plainThing(ty) && /boulder/i.test(ty.id)) || O.types().find(ty => plainThing(ty) && /rock|stone/i.test(ty.id)) || {}).id;
                const c0 = swayCells[0];
                const before = O.spriteAt(c0.x, c0.y);
                put(c0.x, c0.y, rock);
                await t.waitUntil(() => { const s = O.spriteAt(c0.x, c0.y); return !!s && s._ufReady && s._ufType === O.typeId(rock); }, 3000, "the rock to be drawn").catch(() => {});
                await t.waitFrames(1);
                const after = O.spriteAt(c0.x, c0.y);
                const frames = new Set();
                for (let f = 0; f < 30; f++) {
                    await t.waitFrames(1);
                    const s = O.spriteAt(c0.x, c0.y);
                    frames.add(s ? `${s._frame.x},${s._frame.y},${s._frame.width},${s._frame.height}` : "none");
                }
                const ao = Anim.objectAt(c0.x, c0.y);
                const rockOk = !!rock && !!after && after === before && frames.size === 1 && !!ao && ao.state === "" && ao.col === null;
                t.check("object_frames",
                    swayOk && shopOk && fireOk && shopBack && rockOk,
                    `8 sway objects in a row: columns ${seqs.slice(0, 3).map(s => dedupe(s).join("")).join(" / ")} ...; frames off sway[floor((map updates - 1 + phase) / 9) % 3] ${mismatch} (want 0); frames with all 8 in unison ${unison} of 45; phases mod 27: ${Array.from(phases).join(",")} (want >= 2 distinct); ` +
                    `workshop with a job at it: ${dedupe(shopCols).join(",")} state ${Array.from(shopStates).join("/")} (want work 1/2), after the job: state "${so2 ? so2.state : "?"}" frame back to its plain one ${shopBack}; lit fire: ${dedupe(fireCols).join(",")} state ${Array.from(fireStates).join("/")} (want lit 1/2); ` +
                    `cell (${c0.x},${c0.y}) given ${rock || "NO ROCK TYPE"}: same pooled sprite ${after === before}, ${frames.size} distinct frame(s) over 30 frames (want 1), state "${ao ? ao.state : "?"}"`);
                removeUnits([worker]);
                restoreCells();
                await t.waitFrames(2);
            }

            // 6. layers: an equipped stone axe's layer sheet sits on the body's frame; unequipping removes it; an item
            // without a layer sheet draws nothing.
            {
                let bare = null;
                for (const ty of I.types()) if (ty.id !== AXE_ID && (ty.tool || ty.weapon) && !onDisk(LAYER_PREFIX + ty.id)) { bare = ty.id; break; }
                const La = add("TEST_anim_axe_tool", BODY, ax + 2, ay + 2, 2, { inventory: [], equipment: { tool: null, clothes: null } });
                const axe = I.give(AXE_ID, 1, La.id)[0];
                La.data.equipment.tool = axe ? axe.id : null;
                const Lb = add("TEST_anim_axe_weapon", BODY, ax + 4, ay + 2, 2, { equipment: { weapon: AXE_ID } });
                const Lc = add("TEST_anim_no_layer", BODY, ax + 6, ay + 2, 2, { equipment: { weapon: bare } });
                const Ld = add("TEST_anim_axe_carrier", BODY, ax + 8, ay + 2, 8, { inventory: [], equipment: {}, workRate: 0.0001 });
                const carried = I.give(AXE_ID, 1, Ld.id)[0];
                const units = [La, Lb, Lc, Ld];
                await t.waitUntil(() => units.every(drawn), 8000, "the layer units to be drawn");
                await t.waitUntil(() => Anim.layersOf(La).list.length === 1 && Anim.layersOf(Lb).list.length === 1, 4000, "the axe layers").catch(() => {});
                const sheet = layerSheet(AXE_ID).bitmap;
                let onFrame = 0, offFrame = 0;
                const bodyCols = new Set();
                const follow = u => {
                    const s = spriteOfUnit(u), L = Anim.layersOf(u).list;
                    if (!s || L.length !== 1) return false;
                    const k = L[0].sprite;
                    return k.visible && k.parent === s && k.bitmap === sheet && colOf(k) === colOf(s) && rowOf(k) === rowOf(s) && L[0].typeId === AXE_ID;
                };
                C.playAttackAnimation(La, Lb);
                for (let f = 1; f <= 40; f++) {
                    await t.waitFrames(1);
                    for (const u of [La, Lb]) {
                        if (follow(u)) onFrame++;
                        else offFrame++;
                    }
                    bodyCols.add(colOf(spriteOfUnit(La)));
                    if (f === 6) {
                        ensureView();
                        t.screenshot("layers");
                    }
                }
                const noLayer = Anim.layersOf(Lc).list.length === 0 && !spriteOfUnit(Lc).children.some(c => c._ufAnimLayer);
                // Facing north the held axe goes behind the body (and the body is drawn again over it); south in front.
                const evA = W.eventOf(La.id);
                evA.setDirection(8);
                await t.waitFrames(2);
                const sA = spriteOfUnit(La), LN = Anim.layersOf(La);
                const northOk = LN.list.length === 1 && LN.list[0].behind && !!LN.over && sA.children.indexOf(LN.list[0].sprite) < sA.children.indexOf(LN.over) && LN.over._frame.x === sA._frame.x && LN.over._frame.y === sA._frame.y && rowOf(LN.list[0].sprite) === 3;
                evA.setDirection(2);
                await t.waitFrames(2);
                const LS = Anim.layersOf(La);
                const southOk = LS.list.length === 1 && !LS.list[0].behind && !LS.over && sA.children[sA.children.length - 1] === LS.list[0].sprite;
                // The tool a job uses: Ld carries an axe (not equipped) and chops; the axe shows while it works.
                const oak = (O.types().find(ty => ty.actions && ty.actions.chop && (ty.image || ty.tile) && !(ty.tags || []).includes("building")) || {}).id;
                let workLayer = "not run", afterWork = -1;
                if (oak && carried) {
                    put(Ld.x, Ld.y - 1, oak);
                    const chop = J.create({ type: "chop", target: { area: { x: area.x, y: area.y }, x: Ld.x, y: Ld.y - 1 }, owner: Ld.id });
                    await t.waitUntil(() => !!chop && chop.state === "work" && Anim.layersOf(Ld).list.length === 1, 4000, "the chopper's axe").catch(() => {});
                    const LW = Anim.layersOf(Ld).list;
                    workLayer = chop ? `chop #${chop.id} ${chop.state}, layers ${LW.map(l => `${l.typeId}@${l.slot}`).join(",") || "none"}` : "chop not created";
                    if (chop) J.cancel(chop.id, "test over");
                    await t.waitFrames(3);
                    afterWork = Anim.layersOf(Ld).list.length;
                }
                const workOk = oak && carried ? /stone_axe@weapon/.test(workLayer) && afterWork === 0 : false;
                // Unequipping removes it; the sprite goes back to the pool.
                const kid = Anim.layersOf(La).list[0] ? Anim.layersOf(La).list[0].sprite : null;
                const pool0 = animLayer().kidPoolSize();
                La.data.equipment.tool = null;
                await t.waitFrames(2);
                const unequipOk = Anim.layersOf(La).list.length === 0 && !!kid && !kid.parent && animLayer().kidPoolSize() > pool0;
                t.check("layers",
                    onFrame === 80 && offFrame === 0 && bodyCols.size >= 3 && noLayer && northOk && southOk && workOk && unequipOk && !!bare,
                    `${AXE} (${sources[AXE]}) on a unit with equipment.tool = item #${axe ? axe.id : "?"} and one with equipment.weapon = "${AXE_ID}": on the body's column and row in ${onFrame} of 80 samples (want 80) while the body showed columns ${Array.from(bodyCols).sort((a, b) => a - b).join(",")}; ` +
                    `"${bare}" equipped (no layer sheet): layer sprites ${Anim.layersOf(Lc).list.length} (want 0); facing N: behind ${northOk}; facing S: in front ${southOk}; carried axe while chopping: ${workLayer}, after the job ${afterWork} layer(s) (want stone_axe@weapon, then 0); after unequipping: ${Anim.layersOf(La).list.length} layers, sprite detached ${!!kid && !kid.parent}, pool ${pool0} -> ${animLayer().kidPoolSize()}`);
                removeUnits(units);
                restoreCells();
                await t.waitFrames(2);
            }

            // 7. remains_saved: the remains survive a save round trip, lie unchanged (no fade) and go after remainsHours.
            {
                const cell = deathCell || { x: ax + 3, y: ay + 1 };
                const re = Anim.remainsAt(cell.x, cell.y).slice(-1)[0] || null;
                const rs = Anim.spriteAt(cell.x, cell.y);
                const rsCol = rs ? colOf(rs) : -1;
                const lyingOk = !!re && re === deathEntry && !!rs && rs.visible && rsCol === 17 && re.until - killedAt === Math.round(remainsHours() * 60);
                const json = JsonEx.stringify(DataManager.makeSaveContents());
                const back = JsonEx.parse(json);
                const savedAnim = back.ufWorld && back.ufWorld.anim;
                const sameJson = !!savedAnim && JSON.stringify(savedAnim.remains) === JSON.stringify(Anim.remains());
                W.state.anim = savedAnim; // what a load does: a new state object
                await t.waitUntil(() => { const r = Anim.remainsAt(cell.x, cell.y).slice(-1)[0]; const sp = Anim.spriteAt(cell.x, cell.y); return !!r && !!sp && sp._ufEntry === r && sp.visible; }, 3000, "the loaded remains to be drawn").catch(() => {});
                const reloaded = Anim.remainsAt(cell.x, cell.y).slice(-1)[0] || null;
                const rs2 = Anim.spriteAt(cell.x, cell.y);
                const seen2 = rs2 ? { fromLoaded: rs2._ufEntry === reloaded, col: colOf(rs2), row: rowOf(rs2), visible: rs2.visible } : null;
                const reloadOk = !!reloaded && reloaded !== re && !!seen2 && seen2.visible && seen2.fromLoaded && seen2.col === 17 && seen2.row === 1;
                // Remains of a sheet that no longer exists draw nothing and stop nothing.
                const ghostSheet = "$TEST_anim_no_such_sheet";
                const e0 = errs0();
                const missing = Anim.addRemains({ x: ax + 9, y: ay + 4, image: ghostSheet, index: 0, frame: 1, dir: 2, until: Anim.nowMinutes() + 60 });
                await t.waitFrames(30);
                const ms = Anim.spriteAt(ax + 9, ay + 4);
                const msSeen = ms ? { visible: ms.visible, error: !!ms.bitmap && ms.bitmap.isError() } : null;
                const newErrs = errs0() - e0, onMap = SceneManager._scene instanceof Scene_Map && !SceneManager._exiting;
                const missingOk = !!missing && !!msSeen && !msSeen.visible && msSeen.error && newErrs === 0 && onMap;
                Anim.clearRemains(e => e.image === ghostSheet);
                advanceClock(reloaded ? reloaded.until - Anim.nowMinutes() - 30 : 0);
                await t.waitFrames(3);
                const rs3 = Anim.spriteAt(cell.x, cell.y);
                const lateAlpha = rs3 ? rs3.alpha : -1, lateVisible = !!rs3 && rs3.visible;
                advanceClock(31);
                await t.waitFrames(3);
                const goneState = Anim.remainsAt(cell.x, cell.y).length === 0, goneSprite = !Anim.spriteAt(cell.x, cell.y);
                restoreClock(clock0);
                t.check("remains_saved",
                    lyingOk && sameJson && reloadOk && missingOk && lateVisible && lateAlpha === 1 && goneState && goneSprite,
                    `entry ${re ? JSON.stringify(re) : "MISSING"} (until - death = ${re ? re.until - killedAt : "?"} min, want ${Math.round(remainsHours() * 60)}), drawn on column ${rsCol}; JsonEx round trip identical ${sameJson}; ` +
                    `after swapping in the loaded copy: drawn from the loaded entry ${!!seen2 && seen2.fromLoaded}, column ${seen2 ? seen2.col : "none"} row ${seen2 ? seen2.row : "-"}; remains of a missing sheet: sprite ${msSeen ? `visible ${msSeen.visible}, load error ${msSeen.error}` : "none"}, new errors ${newErrs}, still on the map ${onMap}; ` +
                    `30 game minutes before the end: visible ${lateVisible}, alpha ${lateAlpha} (want 1: no fade); after remainsHours: gone from state ${goneState}, sprite gone ${goneSprite}`);
            }

            // 8. pooled_and_perf: sprites are reused; UF_Anim's work per frame with 100 units and 500 animated objects in view.
            {
                await expireAll();
                restoreClock(clock0);
                // Death sprites: 60 deaths in 6 batches on 10 cells.
                const cells = [];
                for (let i = 0; i < 5; i++) cells.push({ x: ax + i * 2, y: ay }, { x: ax + i * 2 + 1, y: ay + 2 });
                const created0 = stats.created;
                let peak = 0, batches = 0;
                for (let b = 0; b < 6; b++) {
                    const batch = cells.map((c, i) => add(`TEST_anim_pool_${b}_${i}`, BODY, c.x, c.y, [2, 4, 6, 8][(b + i) % 4], { hp: 0 }));
                    await t.waitUntil(() => batch.every(drawn), 8000, "a batch to be drawn");
                    for (const u of batch) C.onUnitDeath(u, null);
                    await t.waitFrames(1);
                    peak = Math.max(peak, ourTilemapSprites());
                    await t.waitUntil(() => Anim.ghostCount() === 0, 4000, "the death frames to finish").catch(() => {});
                    peak = Math.max(peak, ourTilemapSprites());
                    batches++;
                }
                const created = stats.created - created0, remainsN = Anim.remains().length, drawnN = animLayer().activeCount();
                await expireAll();
                const left = ourTilemapSprites(), active = animLayer().activeCount(), stateLeft = Anim.remains().length;
                restoreClock(clock0);
                // Layer sprites: 10 units, the axe put on and taken off 10 times.
                const wearers = [];
                for (let i = 0; i < 10; i++) wearers.push(add(`TEST_anim_wearer_${i}`, BODY, ax + i, ay + 4, 2, { equipment: {} }));
                await t.waitUntil(() => wearers.every(drawn), 8000, "the wearers to be drawn");
                const kids0 = stats.layerSprites;
                let worn = 0;
                for (let r = 0; r < 10; r++) {
                    for (const u of wearers) u.data.equipment.weapon = AXE_ID;
                    await t.waitFrames(2);
                    worn = Math.max(worn, wearers.filter(u => Anim.layersOf(u).list.length === 1).length);
                    for (const u of wearers) u.data.equipment.weapon = null;
                    await t.waitFrames(2);
                }
                const kidsCreated = stats.layerSprites - kids0;
                const kidsLeft = wearers.reduce((n, u) => n + spriteOfUnit(u).children.filter(c => c._ufAnimLayer).length, 0);
                removeUnits(wearers);
                await t.waitFrames(2);
                const poolOk = batches === 6 && created <= 2 * cells.length && peak <= 2 * cells.length && remainsN === 60 && drawnN === cells.length && left === 0 && active === 0 && stateLeft === 0 &&
                    worn === 10 && kidsCreated <= 10 && kidsLeft === 0;
                // Perf: zoom 2/3 over the arena; 500 animated objects on cells in view and 100 idle units (20 with an axe layer).
                // Cells on screen that may take a scratch object for a moment (never a building, wall or door).
                const takes = (x, y) => {
                    const ty = O.at(x, y);
                    return !ty || !(ty.tags || []).some(g => g === "building" || g === "wall" || g === "door" || g === "workplace");
                };
                let vx0 = 0, vy0 = 0, vx1 = -1, vy1 = -1;
                const levels = UF.Camera ? UF.Camera.levels.length : 1;
                for (let lv = Math.min(1, levels - 1); lv < levels; lv++) {
                    ensureView(lv);
                    await t.waitFrames(3);
                    vx0 = Math.ceil($gameMap.displayX());
                    vy0 = Math.ceil($gameMap.displayY());
                    vx1 = Math.floor($gameMap.displayX() + $gameMap.screenTileX()) - 1;
                    vy1 = Math.floor($gameMap.displayY() + $gameMap.screenTileY()) - 1;
                    let n = 0;
                    for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) if (takes(x, y)) n++;
                    if (n >= 500) break;
                }
                const crowd = [];
                for (let y = vy0; y <= vy1 && crowd.length < 100; y++) for (let x = vx0; x <= vx1 && crowd.length < 100; x++) {
                    if ((x + y) % 2 === 0 && free(x, y)) crowd.push(add(`TEST_anim_crowd_${crowd.length}`, BODY, x, y, [2, 4, 6, 8][crowd.length % 4], crowd.length % 5 === 0 ? { equipment: { weapon: AXE_ID } } : {}));
                }
                for (let y = vy0; y <= vy1 && crowd.length < 100; y++) for (let x = vx0; x <= vx1 && crowd.length < 100; x++) {
                    if (free(x, y)) crowd.push(add(`TEST_anim_crowd_${crowd.length}`, BODY, x, y, [2, 4, 6, 8][crowd.length % 4], crowd.length % 5 === 0 ? { equipment: { weapon: AXE_ID } } : {}));
                }
                let objs = 0;
                for (let y = vy0; y <= vy1 && objs < 500; y++) for (let x = vx0; x <= vx1 && objs < 500; x++) {
                    if (!takes(x, y)) continue;
                    put(x, y, "TEST_anim_sway");
                    objs++;
                }
                await t.waitUntil(() => crowd.every(drawn), 10000, "the crowd to be drawn").catch(() => {});
                await t.waitFrames(10);
                const animatedInView = animLayer() && O.layer() ? O.layer()._active.filter(s => s._ufA && s._ufA.on && s._ufX >= vx0 && s._ufX <= vx1 && s._ufY >= vy0 && s._ufY <= vy1).length : 0;
                const unitsInView = crowd.filter(u => drawn(u) && u.x >= vx0 && u.x <= vx1 && u.y >= vy0 && u.y <= vy1).length;
                // The machine is shared with other test runs: its CPU load over the window is measured and reported.
                const cpuNow = () => {
                    try {
                        return require("os").cpus().reduce((a, c) => {
                            const tt = c.times;
                            a.busy += tt.user + tt.nice + tt.sys + tt.irq;
                            a.all += tt.user + tt.nice + tt.sys + tt.irq + tt.idle;
                            return a;
                        }, { busy: 0, all: 0 });
                    } catch (e) {
                        return null;
                    }
                };
                const cpu0 = cpuNow();
                const p0 = { frames: perf.frames, ms: perf.ms, u: perf.unitMs, o: perf.objectMs, l: perf.layerMs };
                perf.worst = 0;
                await t.waitFrames(120);
                const cpu1 = cpuNow();
                const cpuLoad = cpu0 && cpu1 && cpu1.all > cpu0.all ? Math.round((100 * (cpu1.busy - cpu0.busy)) / (cpu1.all - cpu0.all)) : null;
                const n = Math.max(1, perf.frames - p0.frames);
                const avg = (perf.ms - p0.ms) / n, worst = perf.worst;
                const lastN = [];
                for (let k = 1; k <= Math.min(n, 120); k++) lastN.push(perf.recent[(perf.frames - k) & 255]);
                lastN.sort((a, b) => a - b);
                const median = lastN.length ? lastN[lastN.length >> 1] : 0;
                const parts = `units ${((perf.unitMs - p0.u) / n).toFixed(4)}, objects ${((perf.objectMs - p0.o) / n).toFixed(4)}, death/remains layer ${((perf.layerMs - p0.l) / n).toFixed(4)}`;
                const zoomUsed = UF.Camera ? UF.Camera.zoom() : 1;
                t.screenshot("perf_view");
                // The same work back to back, timed as one block (performance.now is coarse in this Chromium: see resolution).
                const crowdSprites = crowd.map(u => spriteOfUnit(u)).filter(Boolean);
                const objLayer = O.layer();
                // The clock moves one map update per round, so the columns change as they do in play.
                const loops = 40, benchRuns = []; // (the clock is left 200 map updates ahead: only relative time matters)
                for (let b = 0; b < 5; b++) {
                    const b0 = performance.now();
                    for (let i = 0; i < loops; i++) {
                        ticks++;
                        stepUnits(SceneManager._scene._spriteset);
                        if (objLayer) stepObjects(objLayer);
                    }
                    benchRuns.push((performance.now() - b0) / loops);
                }
                const bench = Math.min(...benchRuns), benchMean = benchRuns.reduce((a, b) => a + b, 0) / benchRuns.length;
                const objSprites = objLayer ? objLayer._active.length : 0;
                let resolution = Infinity;
                for (let i = 0; i < 20; i++) {
                    const a = performance.now();
                    let b = a;
                    while (b === a) b = performance.now();
                    resolution = Math.min(resolution, b - a);
                }
                const layered = crowd.filter(u => Anim.layersOf(u).list.length === 1).length;
                removeUnits(crowd);
                restoreCells();
                ensureView();
                await t.waitFrames(3);
                t.check("pooled_and_perf",
                    poolOk && median <= 0.3 && bench <= 0.3 && animatedInView >= 500 && unitsInView >= 100,
                    `60 deaths on ${cells.length} cells: ${created} death sprite(s) created (want <= ${2 * cells.length}), at most ${peak} in the tilemap at once, ${remainsN} remains saved, ${drawnN} drawn (one per cell); after they expire ${left} left in the tilemap, ${active} active, ${stateLeft} in state; ` +
                    `axe put on and off 10 times on 10 units: ${worn} wore it at once, ${kidsCreated} layer sprite(s) created (want <= 10), ${kidsLeft} left on them; ` +
                    `perf at zoom ${zoomUsed.toFixed(3)}: ${unitsInView} units (${layered} with a layer) and ${animatedInView} animated objects on screen (${objSprites} object sprites in UF_Objects' layer): UF_Anim per frame over ${n} frames median ${median.toFixed(4)} ms, mean ${avg.toFixed(4)} ms (${parts}), worst ${worst.toFixed(3)} ms; the same unit and object work back to back, the clock moving one map update per round: best of 5 batches ${bench.toFixed(4)} ms per frame (mean of the batches ${benchMean.toFixed(4)}); budget 0.3 ms for the median and the best batch; machine CPU load during the window ${cpuLoad === null ? "not measured" : cpuLoad + " %"} (other test runs share it); performance.now, smallest step seen ${resolution.toFixed(4)} ms`);
            }
        } finally {
            for (const id of made) if (W.unit(id)) W.removeUnit(id);
            restoreCells();
            cat.objects = objectsBefore;
            restoreClock(clock0);
            if (UF.Time && UF.Time.paused) UF.Time.resume();
            Anim.clearRemains(e => scratchNames.includes(e.image) || /^\$TEST_/.test(e.image));
            for (const name of memNames) {
                Anim.setSidecar(name, null);
                delete ImageManager._cache["img/characters/" + Utils.encodeURI(name) + ".png"];
            }
            Anim.forgetLayers();
            if (UF.Camera) UF.Camera.setLevel(zoomLevel);
            await t.waitFrames(2);
        }

        // 9. no_errors
        const errs = t.errorsSoFar().concat(errors.map(e => `UF_Anim ${e}`));
        t.check("no_errors", errs.length === 0, errs.length ? `${errs.length} error(s), first: ${errs[0]}` : "none");
    }
})();
