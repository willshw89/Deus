//=============================================================================
// UF_Speech.js - Over-head speech: plain text floating above the speaker
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Speech] Remarks, barks, shouts, orders and thoughts float as plain text above the speaker's head (VISION V62).
 * @author UF project
 * @orderAfter UF_Visuals
 * @orderAfter UF_Camera
 *
 * @help
 * Anything a character says in passing (a remark, a bark, a shout in a fight,
 * a leader's order, a thought) floats as plain text above their head, follows
 * them as they walk and fades out. No bubble, no box: the game font with a
 * dark outline. Conversations the player opens are UF_Talk's, not this.
 *
 *   UF.Speech.say(speaker, text, { frames, color, kind, queue })
 *     speaker: a unit id, a unit record or a Game_Event (also $gamePlayer)
 *     kind: "remark" (default) | "bark" | "shout" | "order" | "thought"
 *   UF.Speech.clear(speaker) / lines(speaker) / isSpeaking(speaker)
 *
 * Existing barks: UF_Visuals.bark (and UF.Visuals.bark) are wrapped at boot,
 * so every bark is drawn by UF_Speech as kind "bark" with the same duration,
 * and UF_Visuals' own bubble sprite is not created. UF_Visuals.js itself is
 * not edited; nothing breaks when UF_Visuals is absent.
 *
 * Settings: catalog key "speech" in data/UF_WorldCatalog.json (built-in
 * defaults when it is missing). API and checks: docs/systems/UF_Speech.md.
 *
 * Replaced core methods: none (aliases only). Runtime wrap (not a core
 * method): UF_Visuals.bark / UF.Visuals.bark.
 */

(() => {
    "use strict";

    //-------------------------------------------------------------------------
    // Settings (catalog "speech"; these defaults apply to any missing field)

    const LAYER_Z = 900000; // WORLD_ARCHITECTURE §4: above characters and objects, below the fog (1e6)
    const CACHE_MAX = 24;   // text bitmaps kept for reuse (12 on screen at most, the rest recently used)
    const KINDS = ["remark", "bark", "shout", "order", "thought"];
    const DEFAULTS = {
        enabled: true,
        routeBarks: true,
        fontSize: 18,
        lineHeight: 21,
        outlineColor: "rgba(0, 0, 0, 0.9)",
        outlineWidth: 3,
        maxChars: 22,
        maxLines: 3,
        framesBase: 90,
        framesPerChar: 4,
        framesMax: 480,
        fadeIn: 6,
        fadeOut: 20,
        gap: 4,
        spacing: 2,
        maxOnScreen: 12,
        maxQueue: 6,
        minZoom: 0.3,
        headDefault: 48,
        kinds: {
            remark: { color: "#f4f0e2" },
            bark: { color: "#ffe39f" },
            shout: { color: "#ff9d85", bold: true },
            order: { color: "#a9d7ff" },
            thought: { color: "#cdc6ea", italic: true }
        }
    };

    let overrides = null;
    let cfgCache = null;
    let cfgFrom;
    const num = (v, lo, hi, d) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

    /** The merged settings: defaults < catalog "speech" < configure() overrides (tests). */
    function cfg() {
        const cat = (window.$ufWorldCatalog && $ufWorldCatalog.speech) || null;
        if (cfgCache && cfgFrom === cat) return cfgCache;
        const src = Object.assign({}, cat && typeof cat === "object" ? cat : {}, overrides || {});
        const c = {
            enabled: src.enabled !== false,
            routeBarks: src.routeBarks !== false,
            fontSize: num(src.fontSize, 8, 48, DEFAULTS.fontSize),
            lineHeight: num(src.lineHeight, 8, 64, DEFAULTS.lineHeight),
            outlineColor: typeof src.outlineColor === "string" ? src.outlineColor : DEFAULTS.outlineColor,
            outlineWidth: num(src.outlineWidth, 0, 12, DEFAULTS.outlineWidth),
            maxChars: Math.round(num(src.maxChars, 4, 80, DEFAULTS.maxChars)),
            maxLines: Math.round(num(src.maxLines, 1, 20, DEFAULTS.maxLines)),
            framesBase: num(src.framesBase, 1, 3600, DEFAULTS.framesBase),
            framesPerChar: num(src.framesPerChar, 0, 60, DEFAULTS.framesPerChar),
            framesMax: num(src.framesMax, 1, 3600, DEFAULTS.framesMax),
            fadeIn: Math.max(1, Math.round(num(src.fadeIn, 1, 120, DEFAULTS.fadeIn))),
            fadeOut: Math.max(1, Math.round(num(src.fadeOut, 1, 240, DEFAULTS.fadeOut))),
            gap: num(src.gap, -48, 96, DEFAULTS.gap),
            spacing: num(src.spacing, 0, 32, DEFAULTS.spacing),
            maxOnScreen: Math.round(num(src.maxOnScreen, 1, 64, DEFAULTS.maxOnScreen)),
            maxQueue: Math.round(num(src.maxQueue, 1, 64, DEFAULTS.maxQueue)),
            minZoom: num(src.minZoom, 0, 8, DEFAULTS.minZoom),
            headDefault: num(src.headDefault, 0, 480, DEFAULTS.headDefault),
            kinds: {}
        };
        const catKinds = (cat && cat.kinds) || {};
        const ovKinds = (overrides && overrides.kinds) || {};
        const names = new Set(KINDS.concat(Object.keys(catKinds), Object.keys(ovKinds)));
        for (const k of names) {
            const s = Object.assign({}, DEFAULTS.kinds[k] || DEFAULTS.kinds.remark, catKinds[k] || {}, ovKinds[k] || {});
            c.kinds[k] = { color: typeof s.color === "string" ? s.color : DEFAULTS.kinds.remark.color, bold: !!s.bold, italic: !!s.italic };
        }
        cfgCache = c;
        cfgFrom = cat;
        return c;
    }
    const padOf = c => Math.ceil(c.outlineWidth / 2) + 2;

    //-------------------------------------------------------------------------
    // Wrapping: at most maxChars per row and maxLines rows per utterance

    const cpLen = s => {
        let n = 0;
        for (const _ of s) n++; // eslint-disable-line no-unused-vars
        return n;
    };

    /** Splits text into utterances: [[row, row, row], [row], ...]. Words longer than a row are cut. */
    function wrap(text, maxChars, maxLines) {
        const words = String(text).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
        const rows = [];
        let cur = "";
        for (const word of words) {
            let w = word;
            if (cpLen(w) > maxChars) {
                const cps = Array.from(w);
                if (cur) {
                    rows.push(cur);
                    cur = "";
                }
                while (cps.length > maxChars) rows.push(cps.splice(0, maxChars).join(""));
                w = cps.join("");
                if (!w) continue;
            }
            if (!cur) cur = w;
            else if (cpLen(cur) + 1 + cpLen(w) <= maxChars) cur += " " + w;
            else {
                rows.push(cur);
                cur = w;
            }
        }
        if (cur) rows.push(cur);
        const chunks = [];
        for (let i = 0; i < rows.length; i += maxLines) chunks.push(rows.slice(i, i + maxLines));
        return chunks;
    }

    /** Default duration of an utterance of `chars` characters. */
    const framesFor = (chars, c = cfg()) => Math.min(c.framesMax, Math.round(c.framesBase + c.framesPerChar * chars));

    //-------------------------------------------------------------------------
    // Speakers: unit ids / unit records / Game_Event / Game_Player / other characters

    const World = () => (window.UF && UF.World && UF.World.state ? UF.World : null);
    const charKeys = new WeakMap();
    let nextCharKey = 1;

    function refOf(speaker) {
        if (speaker === null || speaker === undefined) return null;
        const W = World();
        if (typeof speaker === "number" || (typeof speaker === "string" && /^\d+$/.test(speaker))) {
            const u = W ? W.unit(Number(speaker)) : null;
            return u ? { type: "unit", id: u.id, key: "u" + u.id } : null;
        }
        if (typeof Game_Event !== "undefined" && speaker instanceof Game_Event) {
            const u = W && W.unitOfEvent ? W.unitOfEvent(speaker) : null;
            if (u) return { type: "unit", id: u.id, key: "u" + u.id };
            if (!window.$gameMap) return null;
            const mapId = $gameMap.mapId(), id = speaker.eventId();
            return { type: "event", mapId, id, key: `e${mapId}:${id}` };
        }
        if (typeof Game_Player !== "undefined" && speaker instanceof Game_Player) return { type: "player", key: "p" };
        if (typeof Game_Character !== "undefined" && speaker instanceof Game_Character) {
            let k = charKeys.get(speaker);
            if (!k) {
                k = nextCharKey++;
                charKeys.set(speaker, k);
            }
            return { type: "char", obj: speaker, key: "c" + k };
        }
        if (typeof speaker === "object" && speaker.id !== undefined && W && W.unit(speaker.id)) {
            return { type: "unit", id: speaker.id, key: "u" + speaker.id };
        }
        return null;
    }

    /** The character to draw above, asked again every frame (never held on to). */
    function characterOf(ref) {
        switch (ref.type) {
            case "unit": {
                const W = World();
                return W ? W.eventOf(ref.id) : null;
            }
            case "event": return window.$gameMap && $gameMap.mapId() === ref.mapId ? $gameMap.event(ref.id) || null : null;
            case "player": return window.$gamePlayer || null;
            case "char": return ref.obj;
        }
        return null;
    }

    /** Whether the speaker still exists (a removed unit or an erased event says nothing more). */
    function aliveRef(ref) {
        if (ref.type === "unit") {
            const W = World();
            return !!(W && W.unit(ref.id));
        }
        if (ref.type === "event") {
            const ev = window.$gameMap && $gameMap.mapId() === ref.mapId ? $gameMap.event(ref.id) : null;
            return !!ev && !ev._erased;
        }
        return true;
    }

    /** A speaker says something only when it is on the map on screen. */
    function canShowNow(ref) {
        if (ref.type === "unit") return !!characterOf(ref);
        return aliveRef(ref) && !!characterOf(ref);
    }

    //-------------------------------------------------------------------------
    // Model: per-speaker queues, the utterances on show (oldest first), counters

    const speakers = new Map(); // key -> { key, ref, current, queue: [utt] }
    const active = [];          // utterances on show, in the order they started
    let nextId = 1;
    let nextGroup = 1;
    let nextSeq = 1;
    const stats = { said: 0, shown: 0, dropped: 0, bitmaps: 0, renders: 0, frames: 0, ms: 0, maxMs: 0, maxAt: 0, over05: 0 };

    const emit = (...a) => { if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(...a); };
    const paused = () => !!(window.UF && UF.Time && UF.Time.paused);

    function snapshot(u) {
        return {
            id: u.id, speaker: u.key, group: u.group, text: u.text, rows: u.rows.slice(), kind: u.kind, color: u.color,
            frames: u.frames, age: u.age, state: u.state, reason: u.reason || null,
            w: u.entry ? u.entry.w : 0, h: u.entry ? u.entry.h : 0
        };
    }

    /**
     * Say something over a speaker's head. Returns the ids of the utterances it became (one per
     * maxLines rows), or null (no text, unknown speaker, speaker not on the map on screen, disabled).
     */
    function say(speaker, text, opts) {
        const c = cfg();
        if (!c.enabled) return null;
        opts = opts || {};
        const ref = refOf(speaker);
        if (!ref || !canShowNow(ref)) return null;
        const clean = String(text === undefined || text === null ? "" : text).replace(/\s+/g, " ").trim();
        if (!clean) return null;
        const kind = c.kinds[opts.kind] ? opts.kind : "remark";
        const style = c.kinds[kind];
        const color = typeof opts.color === "string" && opts.color ? opts.color : style.color;
        let sp = speakers.get(ref.key);
        if (!sp) {
            sp = { key: ref.key, ref, current: null, queue: [] };
            speakers.set(ref.key, sp);
        }
        sp.ref = ref;
        if (opts.queue === false) {
            dropSpeakerLines(sp, "replaced");
        } else {
            // The same line again while it is on show or waiting: nothing new.
            const same = u => u && u.whole === clean && u.kind === kind;
            const dup = same(sp.current) ? sp.current : sp.queue.find(same);
            if (dup) return [sp.current, ...sp.queue].filter(u => u && u.group === dup.group).map(u => u.id);
        }
        const chunks = wrap(clean, c.maxChars, c.maxLines);
        const group = nextGroup++;
        const explicit = Number(opts.frames);
        const utts = chunks.map(rows => {
            const joined = rows.join(" ");
            const frames = explicit > 0 ? Math.min(3600, Math.max(1, Math.round(explicit))) : framesFor(cpLen(joined), c);
            return {
                id: nextId++, key: ref.key, ref, group, whole: clean, text: joined, rows, kind, color,
                bold: style.bold, italic: style.italic, frames, age: 0, state: "queued", reason: null,
                entry: null, seq: 0, sprite: null, spriteLayer: null, charSprite: null, searchWait: 0
            };
        });
        sp.queue.push(...utts);
        const keep = Math.max(c.maxQueue, utts.length);
        while (sp.queue.length > keep) sp.queue.shift().state = "done"; // the oldest waiting lines give way
        startNext(sp, true);
        stats.said++;
        emit("speech:said", ref.key, clean, kind);
        return utts.map(u => u.id);
    }

    /** The victim when the screen is full: the oldest bark, else the oldest line. */
    function victim() {
        for (const u of active) if (u.kind === "bark") return u;
        return active[0];
    }

    function startNext(sp, fromSay) {
        if (sp.current || !sp.queue.length) return false;
        const c = cfg();
        if (active.length >= c.maxOnScreen) {
            if (!fromSay) return false; // a waiting continuation waits for a free place
            while (active.length >= c.maxOnScreen) dropUtt(victim(), "cap");
        }
        const u = sp.queue.shift();
        u.state = "showing";
        u.age = 0;
        u.seq = nextSeq++;
        u.entry = acquire(u);
        active.push(u);
        sp.current = u;
        stats.shown++;
        return true;
    }

    function dropUtt(u, reason) {
        const i = active.indexOf(u);
        if (i >= 0) active.splice(i, 1);
        u.state = "done";
        u.reason = reason;
        if (u.entry) release(u.entry);
        u.entry = null;
        if (u.sprite) {
            u.sprite.visible = false;
            u.sprite._ufUtt = null;
            u.sprite = null;
        }
        const sp = speakers.get(u.key);
        if (sp && sp.current === u) sp.current = null;
        if (reason === "cap") stats.dropped++;
    }

    function dropSpeakerLines(sp, reason) {
        let n = sp.queue.length;
        for (const q of sp.queue) q.state = "done";
        sp.queue.length = 0;
        if (sp.current) {
            dropUtt(sp.current, reason);
            n++;
        }
        return n;
    }

    /**
     * How much of a frame one layer update is. UF_TimeSpeed runs N map updates per displayed frame at xN while
     * the map runs (its determineRepeatNumber); each then counts 1/N, so a line stays up as long at every speed.
     */
    function frameStep() {
        const T = window.UF && UF.Time;
        const m = T && T.multiplier ? T.multiplier() : 1;
        if (!(m > 1)) return 1;
        const scene = SceneManager._scene;
        const running = scene instanceof Scene_Map && scene.isActive() && !T.paused && !$gameMessage.isBusy() && !$gamePlayer.isTransferring();
        return running ? 1 / m : 1;
    }

    /** One frame of time for every line (not while the game is paused). */
    function tick() {
        if (paused()) return false;
        const step = frameStep();
        for (let i = 0; i < active.length; i++) active[i].age += step;
        for (let i = active.length - 1; i >= 0; i--) {
            const u = active[i];
            if (u.age >= u.frames) dropUtt(u, "done");
        }
        for (const sp of speakers.values()) {
            if (!aliveRef(sp.ref)) {
                dropSpeakerLines(sp, "gone");
                speakers.delete(sp.key);
                continue;
            }
            if (!sp.current && sp.queue.length) startNext(sp, false);
            if (!sp.current && !sp.queue.length) speakers.delete(sp.key);
        }
        return true;
    }

    //-------------------------------------------------------------------------
    // Text bitmaps: drawn once per line, cached by text and style, reused (never per frame)

    const cache = []; // { bitmap, key, users, used, w, h, stale }
    let cacheSig = "";
    let useClock = 0;
    const sigOf = c => `${c.fontSize}/${c.lineHeight}/${c.maxChars}/${c.maxLines}/${c.outlineWidth}/${c.outlineColor}`;
    const mainFont = () => (window.$gameSystem && $gameSystem.mainFontFace ? $gameSystem.mainFontFace() : "rmmz-mainfont, sans-serif");

    function acquire(u) {
        const c = cfg();
        const sig = sigOf(c);
        if (sig !== cacheSig) {
            // Settings changed: the old bitmaps may not fit. Free ones go now, used ones when released.
            for (let i = cache.length - 1; i >= 0; i--) {
                if (cache[i].users === 0) {
                    cache[i].bitmap.destroy();
                    cache.splice(i, 1);
                } else cache[i].stale = true;
            }
            cacheSig = sig;
        }
        const key = `${u.kind}|${u.color}|${u.bold ? 1 : 0}${u.italic ? 1 : 0}|${u.rows.join("\n")}`;
        let e = cache.find(x => x.key === key && !x.stale);
        if (e) {
            e.users++;
            e.used = ++useClock;
            return e;
        }
        let free = null;
        for (const x of cache) if (x.users === 0 && !x.stale && (!free || x.used < free.used)) free = x;
        if (!free || cache.length < CACHE_MAX) {
            const pad = padOf(c);
            let bw = Math.ceil(c.maxChars * c.fontSize * 0.75) + pad * 2;
            if (bw % 2) bw++;
            const bh = c.maxLines * c.lineHeight + pad * 2;
            e = { bitmap: new Bitmap(bw, bh), key: "", users: 0, used: 0, w: 0, h: 0, stale: false };
            e.bitmap.smooth = false;
            stats.bitmaps++;
            cache.push(e);
        } else e = free;
        draw(e, u, c);
        e.key = key;
        e.users = 1;
        e.used = ++useClock;
        return e;
    }

    function release(e) {
        e.users = Math.max(0, e.users - 1);
        if (e.stale && e.users === 0) {
            const i = cache.indexOf(e);
            if (i >= 0) cache.splice(i, 1);
            e.bitmap.destroy();
        }
    }

    function draw(e, u, c) {
        const b = e.bitmap;
        b.clear();
        b.fontFace = mainFont();
        b.fontSize = c.fontSize;
        b.fontBold = !!u.bold;
        b.fontItalic = !!u.italic;
        b.textColor = u.color;
        b.outlineColor = c.outlineColor;
        b.outlineWidth = c.outlineWidth;
        const pad = padOf(c);
        let maxW = 0;
        for (const r of u.rows) maxW = Math.max(maxW, b.measureTextWidth(r));
        let w = Math.min(Math.ceil(maxW), b.width - pad * 2) + pad * 2;
        if (w % 2) w++;
        if (w > b.width) w = b.width - (b.width % 2);
        for (let i = 0; i < u.rows.length; i++) b.drawText(u.rows[i], pad, pad + i * c.lineHeight, w - pad * 2, c.lineHeight, "center");
        e.w = w;
        e.h = pad * 2 + u.rows.length * c.lineHeight;
        stats.renders++;
    }

    //-------------------------------------------------------------------------
    // The layer: one child of the tilemap (z 900000), counter-scaled so text keeps its screen size

    class Sprite_UFSpeechLayer extends Sprite {
        constructor() {
            super();
            this.z = LAYER_Z;
            this._pool = [];
            this._rects = [];
            this._zoom = 1;
            Speech._layer = this;
        }

        update() {
            if (Speech._layer !== this) return;
            const t0 = performance.now();
            this.show();
            tick();
            const ms = performance.now() - t0;
            stats.frames++;
            stats.ms += ms;
            if (ms > stats.maxMs) {
                stats.maxMs = ms;
                stats.maxAt = stats.frames;
            }
            if (ms > 0.5) stats.over05++;
        }

        spriteFor(u) {
            if (u.sprite && u.spriteLayer === this && u.sprite._ufUtt === u) return u.sprite;
            let s = null;
            for (const p of this._pool) {
                if (!p._ufUtt) {
                    s = p;
                    break;
                }
            }
            if (!s) {
                s = new Sprite();
                s.anchor.set(0.5, 1);
                this._pool.push(s);
                this.addChild(s);
            }
            s._ufUtt = u;
            u.sprite = s;
            u.spriteLayer = this;
            s.bitmap = u.entry.bitmap;
            s.setFrame(0, 0, u.entry.w, u.entry.h);
            s.visible = false;
            return s;
        }

        /** Place every line above its speaker's head; later lines move up past earlier ones they would overlap. */
        show() {
            const c = cfg();
            const tm = this.parent;
            const z = tm && tm.scale && tm.scale.x > 0 ? tm.scale.x : 1;
            if (this._zoom !== z || this.scale.x !== 1 / z) {
                this._zoom = z;
                this.scale.set(1 / z, 1 / z);
            }
            for (const s of this._pool) {
                if (s._ufUtt && s._ufUtt.state !== "showing") {
                    s._ufUtt = null;
                    s.visible = false;
                }
            }
            this.visible = c.enabled && z >= c.minZoom - 1e-6;
            if (!this.visible) return;
            const GW = Graphics.width, GH = Graphics.height, gap = c.gap, spc = c.spacing;
            const rects = this._rects;
            let n = 0;
            for (let i = 0; i < active.length; i++) {
                const u = active[i];
                const s = this.spriteFor(u);
                const ch = characterOf(u.ref);
                if (!ch || ch._erased || ch.isTransparent()) {
                    s.visible = false;
                    continue;
                }
                const cx = ch.screenX() * z;
                const bottom = Math.round((ch.screenY() - headOf(u, ch, c)) * z - gap);
                const w = u.entry.w, h = u.entry.h;
                if (cx < 0 || cx > GW || bottom < 0 || bottom - h > GH) {
                    s.visible = false;
                    continue;
                }
                let left = Math.round(cx - w / 2);
                if (left < 2) left = 2;
                if (left + w > GW - 2) left = GW - 2 - w;
                let bot = bottom, top = bottom - h;
                for (let pass = 0, moved = true; moved && pass <= n; pass++) {
                    moved = false;
                    for (let j = 0; j < n; j++) {
                        const r = rects[j];
                        if (left < r.right + spc && left + w > r.left - spc && top < r.bottom + spc && bot > r.top - spc) {
                            bot = r.top - spc;
                            top = bot - h;
                            moved = true;
                        }
                    }
                }
                const r = rects[n] || (rects[n] = { left: 0, right: 0, top: 0, bottom: 0 });
                r.left = left;
                r.right = left + w;
                r.top = top;
                r.bottom = bot;
                n++;
                s.x = left + w / 2;
                s.y = bot;
                const a = Math.min(1, (u.age + 1) / c.fadeIn, (u.frames - u.age) / c.fadeOut);
                s.opacity = Math.max(0, Math.round(a * 255));
                s.visible = true;
            }
        }
    }

    /** Tilemap pixels from the speaker's feet (screenY) to the top of its sprite. */
    function headOf(u, ch, c) {
        let sp = u.charSprite;
        if (!sp || sp._character !== ch || !sp.parent) {
            sp = null;
            if (u.searchWait > 0) u.searchWait--;
            else {
                const ss = SceneManager._scene && SceneManager._scene._spriteset;
                const list = ss && ss._characterSprites;
                if (list) {
                    for (const x of list) {
                        if (x._character === ch) {
                            sp = x;
                            break;
                        }
                    }
                }
                u.charSprite = sp;
                if (!sp) u.searchWait = 30;
            }
        }
        if (!sp || !sp._frame || !(sp._frame.height > 0)) return c.headDefault;
        return sp._frame.height * Math.abs(sp.scale.y) * sp.anchor.y;
    }

    //-------------------------------------------------------------------------
    // Public API

    function clear(speaker) {
        if (speaker === undefined) {
            let n = 0;
            for (const sp of speakers.values()) n += dropSpeakerLines(sp, "cleared");
            speakers.clear();
            for (const u of active.slice()) dropUtt(u, "cleared");
            return n;
        }
        const ref = refOf(speaker);
        const sp = ref && speakers.get(ref.key);
        if (!sp) return 0;
        const n = dropSpeakerLines(sp, "cleared");
        speakers.delete(sp.key);
        return n;
    }

    function lines(speaker) {
        const ref = refOf(speaker);
        const sp = ref && speakers.get(ref.key);
        if (!sp) return [];
        return (sp.current ? [sp.current] : []).concat(sp.queue).map(snapshot);
    }

    function isSpeaking(speaker) {
        const ref = refOf(speaker);
        const sp = ref && speakers.get(ref.key);
        return !!(sp && (sp.current || sp.queue.length));
    }

    const Speech = {
        LAYER_Z, KINDS,
        say, clear, lines, isSpeaking,
        /** Copies of the lines on show, oldest first. */
        active: () => active.map(snapshot),
        /** The utterances text would become: [[row, ...], ...]. */
        wrap: text => { const c = cfg(); return wrap(text, c.maxChars, c.maxLines); },
        framesFor: text => framesFor(cpLen(String(text)), cfg()),
        config: () => cfg(),
        /** Test hook: settings laid over the catalog's (null = none). */
        configure(o) {
            overrides = o ? Object.assign({}, o) : null;
            cfgCache = null;
        },
        stats: () => Object.assign({}, stats, { active: active.length, speakers: speakers.size, cached: cache.length }),
        resetStats() {
            stats.frames = 0;
            stats.ms = 0;
            stats.maxMs = 0;
            stats.maxAt = 0;
            stats.over05 = 0;
        },
        /** The layer sprite showing an utterance, or null. */
        spriteOf(id) {
            const L = Speech._layer;
            if (!L) return null;
            for (const s of L._pool) if (s._ufUtt && s._ufUtt.id === id) return s;
            return null;
        },
        layer: () => Speech._layer,
        routeBarks,
        _layer: null,
        _debug: { active, speakers, cache },
        Sprite_UFSpeechLayer
    };
    window.UF = window.UF || {};
    window.UF.Speech = Speech;

    //-------------------------------------------------------------------------
    // Barks: UF_Visuals.bark and UF.Visuals.bark go through UF_Speech (runtime wrap; UF_Visuals.js is not edited)

    function visualsBarksOn() {
        if (!window.UF_Visuals) return true;
        const p = PluginManager.parameters("UF_Visuals") || {};
        return (p.EnableBarks || "true") === "true"; // UF_Visuals' own switch still turns barks off
    }

    let oldBarkFailed = false;
    function routedBark(original) {
        const fn = function(character, text, duration) {
            const c = cfg();
            if (!c.enabled || !c.routeBarks) {
                // Switched off in the catalog: UF_Visuals' own bubble. Its drawBark uses ctx.roundRect, which this
                // NW.js lacks (found 2026-09-19), so a throw is caught here rather than stopping the game.
                if (!original) return undefined;
                try {
                    return original.apply(this, arguments);
                } catch (e) {
                    if (!oldBarkFailed) console.warn(`UF_Speech: UF_Visuals.bark failed (${e && e.message}); barks are not shown while catalog speech.routeBarks is false`);
                    oldBarkFailed = true;
                    return undefined;
                }
            }
            if (!visualsBarksOn()) return null;
            const d = Number(duration);
            return say(character, text, { kind: "bark", frames: d > 0 ? d : 180 }); // 180 = UF_Visuals' default
        };
        fn._ufSpeech = true;
        fn._ufOriginal = original || null;
        return fn;
    }

    function routeBarks() {
        const V = window.UF_Visuals;
        if (V && typeof V.bark === "function" && !V.bark._ufSpeech) V.bark = routedBark(V.bark);
        window.UF = window.UF || {};
        if (!UF.Visuals && V) UF.Visuals = V;
        if (!UF.Visuals) UF.Visuals = { _ufSpeechShim: true }; // UF_Colonists calls UF.Visuals.bark
        if (typeof UF.Visuals.bark !== "function") UF.Visuals.bark = routedBark(null);
        else if (!UF.Visuals.bark._ufSpeech) UF.Visuals.bark = routedBark(UF.Visuals.bark);
        return true;
    }
    routeBarks();

    //-------------------------------------------------------------------------
    // Engine hooks (aliases only)

    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);
        if (this._tilemap) {
            this._ufSpeechLayer = new Sprite_UFSpeechLayer();
            this._tilemap.addChild(this._ufSpeechLayer);
        }
    };

    // A new map (or a new or loaded game): the speakers are gone.
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        clear();
        _Game_Map_setup.call(this, mapId);
    };
    const _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        clear();
        _DataManager_setupNewGame.call(this);
    };
    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        clear();
        _DataManager_extractSaveContents.call(this, contents);
    };

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        routeBarks(); // again, after every plugin has loaded
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "speech", on request: node tools/run_tests.js speech --game <snapshot>)

    function registerChecks() {
        UF.Test.suite("speech", async t => {
            const W = World(), S = Speech, c = cfg();
            const errors0 = t.errorsSoFar().length;
            const scene = () => SceneManager._scene;
            const tilemap = () => scene()._spriteset._tilemap;
            const layer = () => scene()._spriteset._ufSpeechLayer;
            const cam = window.UF.Camera || null;
            const T = window.UF.Time || null;
            const C = window.UF.Colonists || null;
            const startLevel = cam ? cam.level() : 0;
            const colonistsOn = C ? C.isEnabled() : null;
            const made = [];
            const pausedAtStart = T ? T.paused : false;
            const speedAtStart = T && T.level ? T.level() : 0;
            const round1 = v => Math.round(v * 10) / 10;
            try {
                if (!W || !W.currentArea()) {
                    t.check("setup", false, "no UF.World area on screen");
                    return;
                }
                if (T && T.paused) T.resume();
                if (C) C.setEnabled(false); // no new colonist jobs (and their barks) while lines are counted
                S.clear();
                if (cam) cam.setLevel(0);
                const area = W.currentArea();
                const aw = { x: area.x, y: area.y };
                const site = C && C.site ? C.site() : null;
                const cx0 = site ? site.x : $gamePlayer.x, cy0 = site ? site.y : $gamePlayer.y;
                const used = new Set();
                const keyOf = (x, y) => y * 100000 + x;
                const free = (x, y) => !used.has(keyOf(x, y)) && W.cellFree(area.x, area.y, x, y) && W.walkable(area.x, area.y, x, y);
                const colImg = C && C.list().length ? Object.assign({}, C.list()[0].image) : { characterName: "People1", characterIndex: 0 };
                const spawn = (name, x, y) => {
                    used.add(keyOf(x, y));
                    const u = W.addUnit({ name, image: Object.assign({}, colImg), area: aw, x, y, dir: 2, data: { kind: "test" } });
                    made.push(u.id);
                    return u;
                };
                const sprOf = id => {
                    const ev = W.eventOf(id);
                    return ev ? scene()._spriteset._characterSprites.find(s => s._character === ev) || null : null;
                };
                const bounds = s => (s ? s.getBounds() : null);
                const shown = s => !!s && s.visible && s.worldVisible && s.opacity > 0;
                const centreDx = (lb, cb) => (lb && cb ? (lb.x + lb.width / 2) - (cb.x + cb.width / 2) : NaN);
                const gapAbove = (lb, cb) => (lb && cb ? cb.y - (lb.y + lb.height) : NaN);
                const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
                const centreOn = async (x, y) => {
                    $gamePlayer.locate(x, y);
                    await t.waitFrames(3);
                };

                // Three test speakers: A, B east of A, C north of A.
                let A = null, B = null, Cn = null;
                search: for (let r = 0; r < 14; r++) {
                    for (let dy = -r; dy <= r; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                            const x = cx0 + dx, y = cy0 + dy;
                            if (free(x, y) && free(x + 1, y) && free(x, y - 1)) {
                                A = spawn("TEST_A", x, y);
                                B = spawn("TEST_B", x + 1, y);
                                Cn = spawn("TEST_C", x, y - 1);
                                break search;
                            }
                        }
                    }
                }
                if (!A) {
                    t.check("setup", false, `no three free cells near (${cx0},${cy0})`);
                    return;
                }
                await centreOn(A.x, A.y);
                await t.waitUntil(() => [A, B, Cn].every(u => !!sprOf(u.id)), 5000, "the test speakers' sprites").catch(() => {});
                await t.waitFrames(5);

                // 1. say_shows: above the head within 2 frames, centred within 2 px
                {
                    const ids = S.say(A.id, "Good morrow to you.");
                    await t.waitFrames(2);
                    const ls = ids ? S.spriteOf(ids[0]) : null, cs = sprOf(A.id);
                    const lb = shown(ls) ? bounds(ls) : null, cb = bounds(cs);
                    const dx = centreDx(lb, cb), up = gapAbove(lb, cb);
                    t.check("say_shows", !!lb && !!cb && Math.abs(dx) <= 2 && up >= 0 && up <= c.gap + 2 && lb.width >= 40,
                        `line ${lb ? `${round1(lb.width)}x${round1(lb.height)} at (${round1(lb.x)},${round1(lb.y)}), opacity ${ls.opacity}` : "NOT VISIBLE"} 2 frames after say; speaker sprite ${cb ? `${round1(cb.width)}x${round1(cb.height)}, top ${round1(cb.y)}` : "missing"}; centre offset ${round1(dx)} px (max 2); gap to the head ${round1(up)} px (want 0..${c.gap + 2})`);
                }

                // 2. timed: default duration, fade in and out, explicit frames, the 480 cap
                {
                    S.clear();
                    const txt = "Hello there, neighbour.";
                    const want = Math.min(c.framesMax, c.framesBase + c.framesPerChar * txt.length);
                    const f0 = Graphics.frameCount;
                    const ids = S.say(A.id, txt);
                    const first = S.lines(A.id)[0];
                    const trace = [];
                    await t.waitUntil(() => {
                        const s = S.spriteOf(ids[0]);
                        trace.push({ f: Graphics.frameCount - f0, op: shown(s) ? s.opacity : 0 });
                        return !S.isSpeaking(A.id);
                    }, 8000, "the timed line to end").catch(() => {});
                    const vis = trace.filter(p => p.op > 0);
                    const firstOp = vis.length ? vis[0].op : -1;
                    const full = trace.find(p => p.f === c.fadeIn + 2);
                    const lastVis = vis.length ? vis[vis.length - 1] : null;
                    const endF = trace.length ? trace[trace.length - 1].f : -1;
                    const ids2 = S.say(A.id, "Brief.", { frames: 40 });
                    const f1 = Graphics.frameCount;
                    const l2 = S.lines(A.id)[0];
                    await t.waitUntil(() => !S.isSpeaking(A.id), 4000, "the 40-frame line to end").catch(() => {});
                    const end2 = Graphics.frameCount - f1;
                    S.configure({ maxLines: 30 });
                    const longText = "word ".repeat(30).trim();
                    S.say(A.id, longText);
                    const capped = S.lines(A.id)[0];
                    S.configure(null);
                    S.clear();
                    const ok = !!first && first.frames === want && firstOp > 0 && firstOp < 255 && !!full && full.op === 255 &&
                        !!lastVis && lastVis.op < 80 && Math.abs(endF - want) <= 3 && !!ids2 && l2.frames === 40 && Math.abs(end2 - 40) <= 3 &&
                        !!capped && capped.frames === c.framesMax;
                    t.check("timed", ok,
                        `"${txt}" (${txt.length} chars): frames ${first ? first.frames : "?"} (want ${c.framesBase} + ${c.framesPerChar} x ${txt.length} = ${want}), ended after ${endF} frames; opacity first seen ${firstOp}, at frame ${c.fadeIn + 2} ${full ? full.op : "?"}, last seen ${lastVis ? lastVis.op : "?"}; frames: 40 -> ${l2 ? l2.frames : "?"}, ended after ${end2}; ${longText.length}-char line -> ${capped ? capped.frames : "?"} frames (cap ${c.framesMax})`);
                }

                // 3. wraps: 22 characters a row, 3 rows an utterance, the rest in order after it
                {
                    S.clear();
                    const long = "The river rose in the night and took the old footbridge with it, so mind the stepping stones and walk slowly past the reeds. Unbelievablylongwordthatneedscutting here.";
                    const chunks = S.wrap(long);
                    const rows = [].concat(...chunks);
                    const rowsOk = rows.every(r => Array.from(r).length <= c.maxChars) && chunks.every(ch => ch.length >= 1 && ch.length <= c.maxLines);
                    const sameText = rows.join("").replace(/\s+/g, "") === long.replace(/\s+/g, "");
                    const cut = rows.some(r => r === "Unbelievablylongwordth");
                    const ids = S.say(A.id, long, { frames: 24 });
                    const firstLine = S.lines(A.id)[0];
                    const pad = padOf(c);
                    const hOk = !!firstLine && firstLine.h === pad * 2 + firstLine.rows.length * c.lineHeight;
                    const order = [];
                    let together = 0;
                    await t.waitUntil(() => {
                        const on = S.active().filter(a => a.speaker === "u" + A.id);
                        if (on.length > 1) together++;
                        if (on.length && order[order.length - 1] !== on[0].id) order.push(on[0].id);
                        return !S.isSpeaking(A.id);
                    }, 10000, "the long remark to end").catch(() => {});
                    // Two separate remarks by one speaker: the second waits for the first.
                    const a1 = S.say(A.id, "First, the well.", { frames: 30 });
                    const a2 = S.say(A.id, "Then the mill.", { frames: 30 });
                    const q = S.lines(A.id);
                    const queuedOk = q.length === 2 && q[0].id === a1[0] && q[0].state === "showing" && q[1].id === a2[0] && q[1].state === "queued";
                    await t.waitUntil(() => !S.isSpeaking(A.id), 4000, "the two remarks to end").catch(() => {});
                    const ok = rowsOk && sameText && cut && chunks.length >= 2 && !!ids && ids.length === chunks.length && order.join() === ids.join() && together === 0 && hOk && queuedOk;
                    t.check("wraps", ok,
                        `${long.length} chars -> ${rows.length} rows in ${chunks.length} utterances (rows ${rows.map(r => Array.from(r).length).join("/")}, max ${c.maxChars}; rows per utterance ${chunks.map(ch => ch.length).join("/")}, max ${c.maxLines}); words kept ${sameText}; long word cut ${cut}; shown in order ${order.join() === (ids || []).join()} (${order.length} of ${ids ? ids.length : 0}), frames with 2 of them at once ${together}; first bitmap height ${firstLine ? firstLine.h : "?"} for ${firstLine ? firstLine.rows.length : "?"} rows; second remark queued behind the first ${queuedOk}`);
                }

                // 4. no_box: the pixels between the letters are transparent (no bubble, no box)
                {
                    S.clear();
                    const ids = S.say(A.id, "Well met, good folk of the vale.", { frames: 300 });
                    await t.waitFrames(8);
                    const u = S._debug.active.find(x => x.id === ids[0]);
                    let detail = "line not on show", ok = false;
                    if (u && u.entry) {
                        const e = u.entry, w = e.w, h = e.h;
                        const px = e.bitmap.context.getImageData(0, 0, w, h).data;
                        const alpha = (x, y) => px[(y * w + x) * 4 + 3];
                        let clearPx = 0;
                        for (let i = 3; i < px.length; i += 4) if (px[i] === 0) clearPx++;
                        const frac = clearPx / (w * h);
                        const corners = [alpha(0, 0), alpha(w - 1, 0), alpha(0, h - 1), alpha(w - 1, h - 1)];
                        const pad = padOf(c);
                        let best = -1, bestInk = -1;
                        for (let y = pad; y < pad + c.lineHeight && y < h; y++) {
                            let ink = 0;
                            for (let x = 0; x < w; x++) if (alpha(x, y) > 128) ink++;
                            if (ink > bestInk) { bestInk = ink; best = y; }
                        }
                        let gaps = 0, x0 = -1, x1 = -1;
                        for (let x = 0; x < w; x++) if (alpha(x, best) > 128) { if (x0 < 0) x0 = x; x1 = x; }
                        for (let x = x0 + 1; x < x1; x++) if (alpha(x, best) === 0 && alpha(x - 1, best) !== 0) gaps++;
                        // The screen too: the pixel between the rows, in the middle of the line, shows the ground (not a box colour).
                        const spaces = (u.rows[0].match(/ /g) || []).length;
                        ok = frac >= 0.4 && corners.every(a => a === 0) && gaps >= spaces && spaces >= 1;
                        detail = `bitmap ${w}x${h}: ${Math.round(frac * 100)}% of pixels fully transparent (min 40%); corners alpha ${corners.join("/")}; row "${u.rows[0]}" scanline y ${best}: ${gaps} transparent gaps between its first and last letter (min ${spaces}, one per space)`;
                    }
                    t.check("no_box", ok, detail);
                }

                // 5. follows: the line stays over a walking unit's head
                {
                    S.clear();
                    let wx = null, wy = null;
                    rowSearch: for (let r = 2; r < 16; r++) {
                        for (const y of [A.y + r, A.y - r]) {
                            for (let x = A.x + 4; x >= A.x - 4; x--) {
                                let okRow = true;
                                for (let i = 0; i <= 7 && okRow; i++) okRow = free(x - i, y);
                                if (okRow) { wx = x; wy = y; break rowSearch; }
                            }
                        }
                    }
                    let detail = "no open row of 8 cells near the test speakers", ok = false;
                    if (wx !== null) {
                        const wk = spawn("TEST_walker", wx, wy);
                        await centreOn(wx - 3, wy);
                        await t.waitUntil(() => !!sprOf(wk.id), 5000, "the walker's sprite").catch(() => {});
                        W.sendUnit(wk.id, { area: aw, x: wx - 7, y: wy });
                        const ids = S.say(wk.id, "Off to the well, then.", { frames: 400 });
                        const x0 = wk.x;
                        let worstDx = 0, worstUp = 0, frames = 0, bad = 0, moving = 0;
                        await t.waitUntil(() => {
                            const ls = S.spriteOf(ids[0]), cs = sprOf(wk.id);
                            if (!shown(ls) || !cs) bad++;
                            else {
                                const lb = bounds(ls), cb = bounds(cs);
                                const dx = Math.abs(centreDx(lb, cb)), up = gapAbove(lb, cb);
                                if (dx > worstDx) worstDx = dx;
                                if (up < 0 || up > c.gap + 2) { bad++; worstUp = up; }
                                if (cs._character && cs._character.isMoving()) moving++;
                            }
                            return ++frames >= 90;
                        }, 6000, "90 frames of walking").catch(() => {});
                        const walked = Math.abs(wk.x - x0);
                        ok = !!ids && walked >= 2 && moving >= 20 && worstDx <= 2 && bad === 0;
                        detail = `walker went ${walked} cells in ${frames} frames (moving on ${moving}); line centre off by at most ${round1(worstDx)} px (max 2); frames with the line missing or not just above the head: ${bad}${bad ? ` (gap ${round1(worstUp)})` : ""}`;
                        W.stopUnit(wk.id);
                    }
                    t.check("follows", ok, detail);
                    await centreOn(A.x, A.y);
                }

                // 6. zoom_constant: the same screen size at every zoom; hidden below minZoom
                {
                    S.clear();
                    const ids = S.say(A.id, "The same size, near or far.", { frames: 900 });
                    const per = [];
                    const levels = cam ? cam.levels.length : 1;
                    for (let i = 0; i < levels; i++) {
                        if (cam) cam.setLevel(i);
                        await centreOn(A.x, A.y);
                        const ls = S.spriteOf(ids[0]), cs = sprOf(A.id);
                        const lb = shown(ls) ? bounds(ls) : null, cb = bounds(cs);
                        per.push({ z: cam ? cam.zoom() : 1, w: lb ? lb.width : 0, h: lb ? lb.height : 0, dx: centreDx(lb, cb), up: gapAbove(lb, cb) });
                    }
                    let hiddenFar = null, shownNear = null;
                    if (cam && levels >= 2) {
                        S.configure({ minZoom: (cam.levels[levels - 1] + cam.levels[levels - 2]) / 2 });
                        cam.setLevel(levels - 1);
                        await centreOn(A.x, A.y);
                        hiddenFar = !shown(S.spriteOf(ids[0]));
                        cam.setLevel(levels - 2);
                        await centreOn(A.x, A.y);
                        shownNear = shown(S.spriteOf(ids[0]));
                        S.configure(null);
                    }
                    if (cam) cam.setLevel(0);
                    await centreOn(A.x, A.y);
                    const w0 = per[0].w, h0 = per[0].h;
                    const ok = per.every(p => p.w > 0 && Math.abs(p.w - w0) <= 0.5 && Math.abs(p.h - h0) <= 0.5 && Math.abs(p.dx) <= 2 && p.up >= 0 && p.up <= c.gap + 2) &&
                        (cam ? hiddenFar === true && shownNear === true : true) && layer().z === LAYER_Z;
                    t.check("zoom_constant", ok,
                        `${per.map(p => `zoom ${round1(p.z * 100) / 100}: ${round1(p.w)}x${round1(p.h)} px, centre off ${round1(p.dx)}, gap ${round1(p.up)}`).join("; ")}; minZoom between the two farthest levels: hidden at the farthest ${hiddenFar}, shown at the next ${shownNear}${cam ? "" : " (UF_Camera absent)"}; layer z ${layer().z} (fog 1e6)`);
                    S.clear();
                }

                // 7. overlap: speakers side by side and one behind the other never overlap
                {
                    S.clear();
                    const said = [
                        [A, S.say(A.id, "Fetch the water before the sun is high.", { frames: 600 })],
                        [B, S.say(B.id, "I fetched it yesterday, and the day before.", { frames: 600 })],
                        [Cn, S.say(Cn.id, "Quiet, the both of you!", { frames: 600 })]
                    ];
                    await t.waitFrames(8);
                    const rs = said.map(([u, ids]) => {
                        const ls = ids ? S.spriteOf(ids[0]) : null, cs = sprOf(u.id);
                        const lb = shown(ls) ? bounds(ls) : null, cb = bounds(cs);
                        const nat = lb && cb ? { x: cb.x + cb.width / 2 - lb.width / 2, y: cb.y - c.gap - lb.height, width: lb.width, height: lb.height } : null;
                        return { name: u.name, lb, cb, nat, dx: centreDx(lb, cb) };
                    });
                    let clashes = 0, natural = 0;
                    for (let i = 0; i < rs.length; i++) {
                        for (let j = i + 1; j < rs.length; j++) {
                            if (rs[i].lb && rs[j].lb && intersects(rs[i].lb, rs[j].lb)) clashes++;
                            if (rs[i].nat && rs[j].nat && intersects(rs[i].nat, rs[j].nat)) natural++;
                        }
                    }
                    const ok = rs.every(r => r.lb && Math.abs(r.dx) <= 2) && clashes === 0 && natural >= 1;
                    t.check("overlap", ok,
                        `${rs.map(r => `${r.name}: ${r.lb ? `(${round1(r.lb.x)},${round1(r.lb.y)}) ${round1(r.lb.width)}x${round1(r.lb.height)}, centre off ${round1(r.dx)}` : "NOT VISIBLE"}`).join("; ")}; pairs overlapping on screen ${clashes} (want 0); pairs that would overlap unmoved ${natural} (want >= 1, or the check proves nothing)`);
                    S.clear();
                }

                // 8. barks_routed: UF.Visuals.bark / UF_Visuals.bark -> one UF_Speech line, no old bark sprite
                {
                    S.clear();
                    const countOld = () => tilemap().children.filter(ch => ch && ch.constructor && ch.constructor.name === "Sprite_UFBark").length;
                    const old0 = countOld();
                    const evB = W.eventOf(B.id), evC = W.eventOf(Cn.id);
                    const hasV = !!(window.UF.Visuals && typeof UF.Visuals.bark === "function");
                    const hasLegacy = !!(window.UF_Visuals && typeof UF_Visuals.bark === "function");
                    if (hasV) UF.Visuals.bark(evB, "TEST bark by the new name", 150);
                    if (hasLegacy) UF_Visuals.bark(evC, "TEST bark by the old name");
                    await t.waitFrames(3);
                    const onB = S.active().filter(a => a.speaker === "u" + B.id);
                    const onC = S.active().filter(a => a.speaker === "u" + Cn.id);
                    const old1 = countOld();
                    const sB = onB[0] ? S.spriteOf(onB[0].id) : null;
                    const visB = shown(sB);
                    // Switched off in the catalog: back to UF_Visuals' own bark, which must not stop the game.
                    S.clear();
                    S.configure({ routeBarks: false });
                    let offThrew = null;
                    try {
                        if (hasV) UF.Visuals.bark(evB, "TEST bark with routing off", 60);
                    } catch (e) {
                        offThrew = e.message;
                    }
                    const offLines = S.active().length;
                    S.configure(null);
                    for (const ch of tilemap().children.slice()) if (ch && ch.constructor && ch.constructor.name === "Sprite_UFBark") tilemap().removeChild(ch);
                    const ok = hasV && onB.length === 1 && onB[0].kind === "bark" && onB[0].frames === 150 && visB &&
                        (!hasLegacy || (onC.length === 1 && onC[0].kind === "bark" && onC[0].frames === 180)) &&
                        old1 === 0 && old0 === 0 && UF.Visuals.bark._ufSpeech === true && (!hasLegacy || UF_Visuals.bark._ufSpeech === true) &&
                        offThrew === null && offLines === 0;
                    t.check("barks_routed", ok,
                        `UF.Visuals.bark ${hasV ? "present" : "MISSING"} -> ${onB.length} line(s) on TEST_B${onB[0] ? ` (kind ${onB[0].kind}, ${onB[0].frames} frames, want bark/150, ${visB ? "visible" : "NOT visible"})` : ""}; UF_Visuals.bark ${hasLegacy ? `-> ${onC.length} line(s) on TEST_C${onC[0] ? ` (kind ${onC[0].kind}, ${onC[0].frames} frames, want bark/180)` : ""}` : "absent (UF_Visuals not loaded)"}; old bark sprites in the tilemap before/after ${old0}/${old1} (want 0/0); with speech.routeBarks false: ${offThrew === null ? "no throw" : `THREW ${offThrew}`}, ${offLines} UF_Speech line(s) (want 0)`);
                    S.clear();
                }

                // 9. pause: timers stop while the game is paused; the line stays visible
                {
                    S.clear();
                    let detail = "UF.Time (UF_TimeSpeed) is not loaded", ok = false;
                    if (T && T.pause) {
                        const ids = S.say(A.id, "Hold still a moment.", { frames: 300 });
                        await t.waitFrames(10);
                        const age0 = S.lines(A.id)[0].age;
                        T.pause();
                        await t.waitFrames(60);
                        const l1 = S.lines(A.id)[0];
                        const vis1 = shown(S.spriteOf(ids[0]));
                        T.resume();
                        await t.waitFrames(20);
                        const l2 = S.lines(A.id)[0];
                        ok = !!l1 && l1.age === age0 && vis1 && !!l2 && l2.age >= age0 + 15;
                        detail = `age ${age0} -> ${l1 ? l1.age : "gone"} over 60 paused frames (want unchanged), ${vis1 ? "visible" : "NOT visible"} while paused; ${l2 ? l2.age : "gone"} 20 frames after resuming (want >= ${age0 + 15})`;
                    }
                    t.check("pause", ok, detail);
                    S.clear();
                }

                // 9b. speed_constant: at xN game speed a line lasts as long in real time as at x1
                {
                    S.clear();
                    let detail = "UF.Time.setLevel (UF_TimeSpeed) is not loaded", ok = false;
                    if (T && T.setLevel && T.speeds && T.speeds.length >= 2) {
                        const idx = T.speeds.indexOf(4) >= 0 ? T.speeds.indexOf(4) : T.speeds.length - 1;
                        const measure = async () => {
                            const ids = S.say(A.id, "Steady as she goes.", { frames: 60 });
                            const t0 = performance.now(), k0 = T.ticks();
                            await t.waitUntil(() => !S.isSpeaking(A.id), 6000, "the 60-frame line to end").catch(() => {});
                            return { ok: !!ids, ms: performance.now() - t0, ticks: T.ticks() - k0 };
                        };
                        const base = await measure();
                        T.setLevel(idx);
                        await t.waitFrames(5);
                        const fast = await measure();
                        T.setLevel(0);
                        const ratio = fast.ms / base.ms;
                        ok = base.ok && fast.ok && ratio > 0.6 && ratio < 1.6 && fast.ticks > base.ticks * 2;
                        detail = `a 60-frame line lasted ${Math.round(base.ms)} ms real at x1 (${base.ticks} map updates) and ${Math.round(fast.ms)} ms at x${T.speeds[idx]} (${fast.ticks} map updates): ratio ${ratio.toFixed(2)} (want 0.6..1.6; about ${(1 / T.speeds[idx]).toFixed(2)} if every map update counted a frame; the world must also run over 2x faster)`;
                    }
                    t.check("speed_constant", ok, detail);
                    S.clear();
                }

                // Speakers for the cap and the timing: 17 more test units around the view.
                const crowd = [];
                for (const dy of [-4, -1, 2, 5]) {
                    for (const dx of [-6, -3, 0, 3, 6]) {
                        if (crowd.length >= 17) break;
                        let spot = null;
                        for (let r = 0; r <= 1 && !spot; r++) {
                            for (let ox = -r; ox <= r && !spot; ox++) for (let oy = -r; oy <= r && !spot; oy++) if (free(A.x + dx + ox, A.y + dy + oy)) spot = { x: A.x + dx + ox, y: A.y + dy + oy };
                        }
                        if (spot) crowd.push(spawn(`TEST_crowd${crowd.length + 1}`, spot.x, spot.y));
                    }
                }
                await t.waitUntil(() => crowd.every(u => !!W.eventOf(u.id)), 5000, "the crowd on screen").catch(() => {});
                await t.waitFrames(5);

                // 10. cap: at most 12 lines; the oldest barks go first
                {
                    S.clear();
                    let detail = `only ${crowd.length} free cells for the crowd (need 17)`, ok = false;
                    if (crowd.length >= 17 && T) {
                        T.pause(); // nothing else speaks while the lines are counted
                        // Remarks first, so the oldest lines are remarks: the rule must still pick the (newer) barks.
                        const barks = [], remarks = [], extra = [];
                        let k = 0;
                        const sayR = list => list.push((S.say(crowd[k].id, `TEST remark ${++k}`, { frames: 600 }) || [0])[0]);
                        for (let i = 0; i < 4; i++) sayR(remarks);
                        for (let i = 0; i < 4; i++) barks.push((S.say(crowd[k].id, `TEST bark ${++k}`, { kind: "bark", frames: 600 }) || [0])[0]);
                        for (let i = 0; i < 6; i++) sayR(remarks);
                        const mid = S.active().map(a => a.id);
                        await t.waitFrames(2);
                        const visMid = layer()._pool.filter(s => shown(s) && s._ufUtt).length;
                        for (let i = 0; i < 3; i++) sayR(extra);
                        await t.waitFrames(2);
                        const end = S.active().map(a => a.id);
                        const visEnd = layer()._pool.filter(s => shown(s) && s._ufUtt).length;
                        T.resume();
                        const has = (list, id) => list.includes(id);
                        const okMid = mid.length === 12 && !has(mid, barks[0]) && !has(mid, barks[1]) && has(mid, barks[2]) && has(mid, barks[3]) && remarks.every(id => has(mid, id));
                        const okEnd = end.length === 12 && !has(end, barks[2]) && !has(end, barks[3]) && !has(end, remarks[0]) && remarks.slice(1).every(id => has(end, id)) && extra.every(id => has(end, id));
                        ok = okMid && okEnd && visMid <= 12 && visEnd <= 12 && visEnd >= 10;
                        detail = `4 remarks, 4 barks, 6 remarks (14 lines): ${mid.length} on show (want 12), barks 1-2 dropped ${!has(mid, barks[0]) && !has(mid, barks[1])}, barks 3-4 kept ${has(mid, barks[2]) && has(mid, barks[3])}, all 10 remarks kept ${remarks.every(id => has(mid, id))} (the 2 oldest remarks ${has(mid, remarks[0]) && has(mid, remarks[1]) ? "kept" : "DROPPED"}), ${visMid} visible; 3 more remarks: ${end.length} on show, barks 3-4 dropped ${!has(end, barks[2]) && !has(end, barks[3])}, then the oldest remark ${!has(end, remarks[0])}, the rest kept ${remarks.slice(1).every(id => has(end, id)) && extra.every(id => has(end, id))}, ${visEnd} visible (want 10..12)`;
                    } else if (!T) detail = "UF.Time missing (needed to hold the world still)";
                    t.check("cap", ok, detail);
                    S.clear();
                }

                // 11. perf: 12 lines cost <= 0.2 ms a frame; no bitmap or text drawing after each line's first frame
                {
                    S.clear();
                    let detail = "crowd too small", ok = false;
                    if (crowd.length >= 12) {
                        for (let i = 0; i < 12; i++) S.say(crowd[i].id, `TEST line ${i + 1} for timing`, { frames: 600 });
                        await t.waitFrames(2);
                        const s0 = S.stats();
                        let made0 = 0;
                        const _init = Bitmap.prototype.initialize;
                        Bitmap.prototype.initialize = function() { made0++; return _init.apply(this, arguments); };
                        S.resetStats();
                        await t.waitFrames(120);
                        Bitmap.prototype.initialize = _init;
                        const s1 = S.stats();
                        const avg = s1.frames ? s1.ms / s1.frames : Infinity;
                        ok = s0.active === 12 && s1.active === 12 && s1.frames >= 100 && avg <= 0.2 && s1.bitmaps === s0.bitmaps && s1.renders === s0.renders;
                        detail = `${s1.active} lines on show; layer update ${avg.toFixed(4)} ms a frame on average over ${s1.frames} frames (max ${s1.maxMs.toFixed(3)} ms at update ${s1.maxAt} of the window, ${s1.over05} update(s) over 0.5 ms; budget 0.2 on average); UF_Speech bitmaps made ${s1.bitmaps - s0.bitmaps}, text drawn ${s1.renders - s0.renders} times in those frames (want 0/0; ${s1.bitmaps} bitmaps made in the whole suite, ${s1.cached} cached); Bitmaps made by anything in the game meanwhile: ${made0}`;
                    }
                    t.check("perf", ok, detail);
                    S.clear();
                }

                // Screenshots: two colonists remarking side by side, a bark over a walking unit; zoom 1 and 2/3.
                {
                    for (const id of made.slice()) { W.removeUnit(id); made.splice(made.indexOf(id), 1); }
                    used.clear();
                    let detail = "fewer than two colonists on screen", ok = false;
                    const cols = C ? C.list().filter(u => W.eventOf(u.id)) : [];
                    if (cols.length >= 2) {
                        // The two colonists nearest each other; the second walks up beside the first.
                        let ca = cols[0], cb = cols[1], bestD = Infinity;
                        for (let i = 0; i < cols.length; i++) {
                            for (let j = i + 1; j < cols.length; j++) {
                                const d = Math.abs(cols[i].x - cols[j].x) + Math.abs(cols[i].y - cols[j].y);
                                if (d < bestD) { bestD = d; ca = cols[i]; cb = cols[j]; }
                            }
                        }
                        const blocked = [];
                        const onBlocked = (u, reason) => { if (u && (u.id === ca.id || u.id === cb.id)) blocked.push(`${u.name}: ${reason}`); };
                        if (UF.Events) UF.Events.on("world:unitBlocked", onBlocked);
                        for (const u of [ca, cb]) {
                            const j = window.UF.Jobs && UF.Jobs.of ? UF.Jobs.of(u.id) : null;
                            if (j) UF.Jobs.cancel(j.id, "test");
                            W.stopUnit(u.id);
                        }
                        await t.waitFrames(20);
                        const openRow = (x0, y, len) => { for (let i = 0; i < len; i++) if (!free(x0 + i, y)) return false; return true; };
                        const sideBySide = () => ca.y === cb.y && Math.abs(ca.x - cb.x) === 1;
                        // Candidate pairs of cells (x, y) + (x + 1, y) near the first colonist, nearest first; a cell
                        // either colonist already stands on counts as open.
                        const mine = (x, y) => (x === ca.x && y === ca.y) || (x === cb.x && y === cb.y);
                        const open = (x, y) => mine(x, y) || free(x, y);
                        const canReach = (u, x, y) => (u.x === x && u.y === y) || !W.reachable || W.reachable(aw, u.x, u.y, x, y);
                        const cands = [];
                        for (let r = 0; r < 10 && cands.length < 4; r++) {
                            for (let dy = -r; dy <= r; dy++) {
                                for (let dx = -r; dx <= r; dx++) {
                                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || cands.length >= 4) continue;
                                    const x = ca.x + dx, y = ca.y + dy;
                                    if (open(x, y) && open(x + 1, y) && canReach(ca, x, y) && canReach(cb, x + 1, y)) cands.push({ x, y });
                                }
                            }
                        }
                        const tried = [];
                        let px = null, py = null;
                        for (const cand of cands) {
                            if (sideBySide()) break;
                            if (ca.x !== cand.x || ca.y !== cand.y) W.sendUnit(ca.id, { area: aw, x: cand.x, y: cand.y });
                            if (cb.x !== cand.x + 1 || cb.y !== cand.y) W.sendUnit(cb.id, { area: aw, x: cand.x + 1, y: cand.y });
                            await centreOn(cand.x, cand.y + 1);
                            await t.waitUntil(() => !ca.goal && !cb.goal, 15000, "the two colonists to stand side by side").catch(() => {});
                            await t.waitFrames(5);
                            tried.push(`(${cand.x},${cand.y}) -> ${ca.name} (${ca.x},${ca.y}), ${cb.name} (${cb.x},${cb.y})`);
                        }
                        if (sideBySide()) {
                            px = Math.min(ca.x, cb.x);
                            py = ca.y;
                        }
                        let wy = null, wx0 = null;
                        if (px !== null) {
                            for (const dy of [2, -2, 3, -3, 4, 1]) {
                                for (const ox of [-4, -5, -3, -6, -2]) if (wy === null && openRow(px + ox, py + dy, 10)) { wy = py + dy; wx0 = px + ox; }
                            }
                        }
                        if (px !== null && wy !== null) {
                            await centreOn(px, py + 1);
                            await t.waitFrames(10);
                            const wk = spawn("TEST_passerby", wx0 + 9, wy);
                            await t.waitUntil(() => !!sprOf(wk.id), 5000, "the passer-by's sprite").catch(() => {});
                            W.sendUnit(wk.id, { area: aw, x: wx0, y: wy });
                            await t.waitFrames(12);
                            const la = S.say(ca.id, "Fine weather for the harvest, is it not?", { frames: 400 });
                            const lb2 = S.say(cb.id, "Aye, if the rain holds off.", { frames: 400 });
                            const lw = UF.Visuals.bark(W.eventOf(wk.id), "Make way, make way!", 400);
                            const snap = async name => {
                                await centreOn(px, py + 1);
                                await t.waitFrames(8);
                                const vis = [la, lb2, lw].map(ids => (ids ? shown(S.spriteOf(ids[0])) : false));
                                const dxs = [[la, ca.id], [lb2, cb.id], [lw, wk.id]].map(([ids, id]) => centreDx(ids ? bounds(S.spriteOf(ids[0])) : null, bounds(sprOf(id))));
                                const ev = W.eventOf(wk.id);
                                const walking = !!ev && ev.isMoving();
                                t.screenshot(name);
                                return { vis, dxs, walking, adj: Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y) === 1 };
                            };
                            const s1 = await snap("remarks_zoom1");
                            let s2 = null;
                            if (cam && cam.levels.length >= 2) {
                                cam.setLevel(1);
                                s2 = await snap("remarks_zoom23");
                                cam.setLevel(0);
                            }
                            const good = s => !!s && s.vis.every(Boolean) && s.dxs.every(d => Math.abs(d) <= 2) && s.walking && s.adj;
                            ok = good(s1) && (!cam || good(s2));
                            const txt = s => (s ? `lines visible ${s.vis.join("/")}, centre offsets ${s.dxs.map(round1).join("/")} px, passer-by walking ${s.walking}, colonists side by side ${s.adj}` : "not taken");
                            detail = `colonists ${ca.name} (${ca.x},${ca.y}) and ${cb.name} (${cb.x},${cb.y}); zoom 1: ${txt(s1)}; zoom 2/3: ${txt(s2)}`;
                            W.stopUnit(wk.id);
                        } else {
                            const jobOf = u => { const j = window.UF.Jobs && UF.Jobs.of ? UF.Jobs.of(u.id) : null; return j ? `${j.type} ${j.state}` : "none"; };
                            detail = px === null
                                ? `${ca.name} and ${cb.name} not side by side: ${cands.length} candidate pair(s); tried ${tried.join("; ") || "none"}; now ${ca.name} (${ca.x},${ca.y}) goal ${ca.goal ? `(${ca.goal.x},${ca.goal.y})` : "none"} job ${jobOf(ca)}, ${cb.name} (${cb.x},${cb.y}) goal ${cb.goal ? `(${cb.goal.x},${cb.goal.y})` : "none"} job ${jobOf(cb)}; blocked: ${blocked.join(", ") || "never"}`
                                : `no open row of 10 cells for the passer-by near (${px},${py})`;
                        }
                        if (UF.Events) UF.Events.off("world:unitBlocked", onBlocked);
                    }
                    t.check("screenshot_scene", ok, detail);
                }
            } finally {
                S.clear();
                S.configure(null);
                for (const id of made) W && W.removeUnit(id);
                if (C && colonistsOn !== null) C.setEnabled(colonistsOn);
                if (cam) cam.setLevel(startLevel);
                if (T && T.setLevel) T.setLevel(speedAtStart);
                if (T && pausedAtStart && !T.paused) T.pause();
                if (T && !pausedAtStart && T.paused) T.resume();
            }
            await t.waitFrames(5);
            const errs = t.errorsSoFar().slice(errors0);
            t.check("no_errors", errs.length === 0, errs.length ? errs.slice(0, 3).join(" | ") : "no uncaught errors during the suite");
        }, { isDefault: false });
    }
})();
