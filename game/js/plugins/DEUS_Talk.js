//=============================================================================
// DEUS_Talk.js - Talk with anyone, the old way: portraits, words on the screen, keywords to click
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Talk] Modal conversation interface: faction portraits, branching dialogue keywords, and lore exchange.
 * @author UF project
 * @base DEUS_World
 * @base DEUS_Interact
 * @orderAfter DEUS_Interact
 *
 * @help
 * Conversations (VISION V25, V62 as revised 2026-09-19: talk modeled on the
 * classic portrait-and-keyword conversations). Right-click a person (one of
 * your colonists or a stranger; never an animal) and choose "Talk to
 * <name>". The world pauses and the talk is written straight onto the
 * screen over the map, with no dialog box:
 *   top left     the other person's portrait, and beside it what they say,
 *                a page at a time over a faint darkening of the map; a
 *                "more" mark while pages remain (click, Enter or Space for
 *                the next page; right-click or Esc for the last one)
 *   lower left   your portrait (the selected colonist, else your band's
 *                leader, else your nearest grown person; a shield in your
 *                colours when nobody can) and beside it your keywords, the
 *                questions you can ask: name, job and bye first, then every
 *                topic the other person has mentioned (a partner, their
 *                leader, a place, a faction, the news, a need...). Click one
 *                (or arrows and Enter). Asked keywords are dimmed but can be
 *                asked again.
 *   middle left  a colonist of yours standing within 4 cells chimes in with
 *                their own portrait and a line: always when the answer
 *                concerns them (it names them, their kin, a faction they
 *                love or hate), otherwise now and then (seeded).
 * "bye" (or Esc, or a right-click, on the last page) ends the talk: the
 * farewell floats over the person's head and the world runs again. Hostile
 * people refuse to talk: their refusal floats over their head and no talk
 * opens. Babies babble.
 *
 * Nothing is scripted: every line is a catalog template
 * (data/UF_WorldCatalog.json "talk", section "lines" first, then the older
 * sections) filled with facts read from the simulation.
 *
 * API, state, events and checks: docs/systems/UF_Talk.md
 * Replaced core methods: none (aliases only). Wraps UF.Interact.optionsFor,
 * UF.Interact.handleMouse and UF.Look.isOverUI at runtime and aliases the
 * context menu window's initialize / setOptions, so Talk is in the menu.
 * A capture-phase keydown listener takes Space while a talk is open (so it
 * turns the page instead of toggling the pause).
 */

(() => {
    "use strict";

    const PLUGIN = "DEUS_Talk";
    const params = PluginManager.parameters(PLUGIN) || {};

    //-------------------------------------------------------------------------
    // Constants (layout and cadence; all wording lives in the catalog "talk" section)

    const FACE = 96;               // portrait frame (the stock face cells are 144x144, drawn scaled)
    const SKIN_CORNER = 12;        // each side's window-skin frame around its portrait (VISION V99): corner px (the skin's are 24)
    const MARGIN = 16;             // from the screen edges
    const GAP = 14;                // portrait to text
    const WORDS_MAX_W = 384;       // the words column beside a portrait (px, including padding; clear of the clock and speed controls at the top right)
    const PAGE_LINES = 4;          // lines per page
    const FONT_SIZE = 20;
    const LINE_H = 25;
    const PAD_X = 10, PAD_Y = 6;   // the darkening around the text
    const DIM_STEPS = 4;           // feathered darkening: DIM_STEPS nested rects, 2 px apart
    const DIM_COLOR = "rgba(8,6,4,0.13)";
    const COMP_Y = MARGIN + FACE + 30;  // the companion slot, below the other person's
    const KW_FONT = 20, KW_LINE = 28, KW_PAD = 4, KW_GAP = 14, KW_MAX_ROWS = 6;
    const KW_CACHE = 64;           // keyword word bitmaps kept per screen
    const INPUT_DELAY = 2;         // frames after a talk opens or an answer appears before input is read (the click that chose it)
    const CHIME_RANGE = 4;         // cells (Chebyshev) from the person; catalog talk.lines.chime.range, else talk.chime.range
    const CHIME_CHANCE = 30;       // percent, a remark after an answer; catalog talk.lines.chime.chance, else talk.chime.chance
    const OH_POOL = 4, OH_W = 380, OH_H = 52, OH_FRAMES = 180, OH_FADE = 30, OH_Z = 900000; // over-head fallback (WORLD_ARCHITECTURE s4: bark z 900000, fog 1e6)
    const SOCIAL_RELIEF = 10;      // how much a talk eases your colonist's social need (when UF_Colonists offers an API for it)
    const SALT_TALK = 0x7a1c;      // template choice
    const SALT_FACE = 0xfa5e;      // portrait choice
    const SALT_CHIME = 0xc41e;     // companions chiming in
    const FONT_FACE = "Georgia, 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif";
    const TEXT_COLOR = "#f4ecd8";
    const MORE_COLOR = "#e9c874";
    const FRAME_COLOR = "#b89a5e";
    const KW_TINT = 0xeee4cc, KW_TINT_ASKED = 0xb9b09c, KW_TINT_HOVER = 0xffd45e;
    const BANNED = /\b(avatar|britannia|guardian|lord british|iolo|dupre|shamino|fellowship|moongate|black ?gate|serpent isle|urist|armok|strange mood|fey mood|dwarf fortress|ultima|beholder|mind flayer|illithid|displacer beast|githyanki)\b/i;

    // Used only when the catalog has no "talk" section (a stripped catalog must not break the menu).
    const FALLBACK = {
        kinds: ["colonist", "person"],
        optionLabel: "Talk to {name}",
        keywords: { name: "name", job: "job", bye: "bye", family: "family", home: "home", mood: "mood", others: "others", news: "news" },
        greet: { own_fine: ["Yes?"], friendly: ["Greetings."], wary: ["What do you want?"] },
        refuse: ["Begone."],
        baby: ["Ba!"],
        name: { default: ["I am {name}."] },
        job: { busy: ["Just now I am {job}."], idle: ["Nothing just now."] },
        bye: { own: ["Take care."], friendly: ["Farewell."], wary: ["Go."], hostile: ["Go."], baby: ["Ba!"] },
        unknown: ["I know nothing of that."]
    };

    //-------------------------------------------------------------------------
    // Access to the other systems (all optional except UF_World and UF_Interact)

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Factions = () => (window.UF && UF.Factions) || null;
    const History = () => (window.UF && UF.History) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const Stance = () => (window.UF && UF.Stance) || null;
    const Time = () => (window.UF && UF.Time) || null;
    const Interact = () => (window.UF && UF.Interact) || null;
    const Look = () => (window.UF && UF.Look) || null;
    const Camera = () => (window.UF && UF.Camera) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const testActive = () => !!(window.UF && UF.Test && UF.Test.active);
    const provokeList = String(params.TestProvoke || "").split(",").map(s => s.trim()).filter(Boolean);
    /** Test-only sabotage (plugin parameter TestProvoke, never set in the real plugins.js): proves each check can FAIL. */
    const provoked = name => testActive() && (provokeList.includes("all") || provokeList.includes(name));

    const seed = () => (World() && World().state ? World().state.seed | 0 : 0);
    const hash32 = (...p) => {
        const W = World();
        if (W && W.hash32) return W.hash32(...p);
        let h = 2166136261 >>> 0;
        for (const part of p) {
            let v = part >>> 0;
            for (let i = 0; i < 4; i++) { h ^= v & 255; h = Math.imul(h, 16777619) >>> 0; v >>>= 8; }
        }
        return h >>> 0;
    };
    const strHash = s => {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        return h >>> 0;
    };
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const capFirst = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
    const lowerFirst = s => (s && s.length > 1 && s.charAt(1) === s.charAt(1).toLowerCase() ? s.charAt(0).toLowerCase() + s.slice(1) : s || "");
    let bitmapsMade = 0;           // every Bitmap this plugin creates (the perf check: none per frame)
    const newBitmap = (w, h) => {
        bitmapsMade++;
        return new Bitmap(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
    };

    // Image files are checked before ImageManager sees them (a failed load throws at the next scene change).
    let fsMod = null, pathMod = null, baseDir = "";
    try {
        if (typeof require === "function") {
            fsMod = require("fs");
            pathMod = require("path");
            baseDir = (typeof nw !== "undefined" && nw.__dirname) || process.cwd();
        }
    } catch (e) {
        fsMod = null;
    }
    const existsCache = new Map();
    function fileExists(rel) {
        if (!fsMod) return true;
        if (existsCache.has(rel)) return existsCache.get(rel);
        let ok = false;
        try { ok = fsMod.existsSync(pathMod.join(baseDir, rel)); } catch (e) { ok = false; }
        existsCache.set(rel, ok);
        return ok;
    }

    /** The catalog's "talk" section (or the minimal fallback). */
    const T = () => {
        const c = catalog();
        return (c && c.talk) || FALLBACK;
    };
    /** A template section: talk.lines.<name> first (the portrait-and-keyword lines), then talk.<name> (the older keys), then the fallback. */
    const L = name => {
        const t = T();
        if (t.lines && t.lines[name] !== undefined) return t.lines[name];
        if (t[name] !== undefined) return t[name];
        return FALLBACK[name];
    };
    const word = (key, fallback) => {
        const w = T().words;
        return w && typeof w[key] === "string" ? w[key] : fallback;
    };
    const keywordLabels = () => Object.assign({}, FALLBACK.keywords, T().keywords || {});

    //-------------------------------------------------------------------------
    // Who can talk, and how they feel about the player's faction

    const kinds = () => (Array.isArray(T().kinds) && T().kinds.length ? T().kinds : FALLBACK.kinds);
    function isAlive(u) {
        const d = (u && u.data) || {};
        return !(d.hp !== undefined && d.hp !== null && d.hp <= 0) && !d._isDying && !d.dead;
    }
    function isTalkable(u) {
        return !!u && !!u.data && kinds().includes(u.data.kind) && isAlive(u);
    }
    const playerFactionId = () => {
        const F = Factions();
        return F && F.playerId ? F.playerId() : null;
    };
    /** A faction id with the "player" alias resolved. */
    const resolveFaction = id => {
        if (!id) return null;
        const F = Factions();
        const f = F && F.get ? F.get(id) : null;
        return f ? f.id : id;
    };
    const factionOf = u => {
        const F = Factions();
        const id = u && u.data ? u.data.faction : null;
        return F && id ? F.get(id) : null;
    };
    function isOwn(u) {
        const d = (u && u.data) || {};
        const pid = playerFactionId();
        return d.kind === "colonist" || d.faction === "player" || (!!pid && d.faction === pid);
    }
    function stageOf(u) {
        const d = (u && u.data) || {};
        if (typeof d.age === "number" && d.age < 2) return "baby"; // the $Baby sheet's range (UF_Colonists)
        if (d.stage) return d.stage;
        if (typeof d.age === "number") {
            const H = History();
            if (H && H.stageOf) return H.stageOf(d.age);
            return d.age < 12 ? "child" : d.age < 18 ? "teen" : d.age >= 60 ? "elder" : "adult";
        }
        return "adult";
    }
    /** "own" | "friendly" | "wary" | "hostile" (UF_Stance when present, else the factions' tier). */
    function stanceOf(u) {
        if (!u) return null;
        if (isOwn(u)) return "own";
        let st = null;
        const S = Stance();
        if (S && S.of) {
            const s = S.of(u);
            st = s === "friendly" ? "friendly" : s === "hostile" ? "hostile" : s === "indifferent" ? "wary" : null;
        }
        if (!st) {
            const F = Factions(), fid = u.data ? u.data.faction : null;
            if (F && fid) {
                const tier = F.tierBetween("player", fid).id;
                st = tier === "allied" || tier === "friendly" ? "friendly" : tier === "hostile" || tier === "war" ? "hostile" : "wary";
            } else st = "wary";
        }
        if (st === "hostile" && provoked("hostile_refuses_over_head")) st = "wary";
        return st;
    }
    /** How the talk goes: "baby" (babbles over its head), "hostile" (refuses over its head), else the stance. */
    function modeOf(u) {
        if (stageOf(u) === "baby") return "baby";
        return stanceOf(u);
    }
    function moodBand(u) {
        const mood = u && u.data ? u.data.mood : null;
        if (!mood) return null;
        const bands = T().moodBands || {};
        for (const band of Object.keys(bands)) if (Array.isArray(bands[band]) && bands[band].includes(mood)) return band;
        return "fine";
    }

    //-------------------------------------------------------------------------
    // Reading the simulation (every fact a line uses comes from here)

    const unitById = id => (World() && typeof id === "number" ? World().unit(id) : null);
    const idOf = v => (v && typeof v === "object" ? v.id : v);
    function partnerOf(u) {
        if (provoked("keywords_grow")) return null;
        const d = u.data || {};
        const direct = unitById(idOf(d.partner));
        if (direct) return direct;
        const father = d.pregnancy ? unitById(d.pregnancy.fatherId) : null;
        if (father) return father;
        for (const k of childrenOf(u)) {
            const other = unitById(k.data.motherId === u.id ? k.data.fatherId : k.data.motherId);
            if (other && other.id !== u.id) return other;
        }
        return null;
    }
    function childrenOf(u) {
        const W = World();
        if (!W) return [];
        const listed = Array.isArray(u.data.children) ? u.data.children.map(idOf) : [];
        const out = W.units().filter(c => c.id !== u.id && c.data && (c.data.motherId === u.id || c.data.fatherId === u.id || listed.includes(c.id)));
        return out.sort((a, b) => ((b.data.age | 0) - (a.data.age | 0)) || a.id - b.id);
    }
    const motherOf = u => unitById(u.data.motherId);
    const fatherOf = u => unitById(u.data.fatherId);
    function superiorOf(u) {
        const s = unitById(idOf(u.data && u.data.superior));
        return s && isAlive(s) ? s : null;
    }
    /** The top of a faction's ladder (V52): its living unit of the highest rank >= 1 (lowest id on a tie). */
    function rulerOf(fid) {
        const W = World();
        fid = resolveFaction(fid);
        if (!W || !fid) return null;
        let best = null;
        for (const v of W.units()) {
            const d = v.data;
            if (!d || resolveFaction(d.faction) !== fid || !isAlive(v)) continue;
            const r = d.rank | 0;
            if (r < 1) continue;
            if (!best || r > (best.data.rank | 0) || (r === (best.data.rank | 0) && v.id < best.id)) best = v;
        }
        return best;
    }
    function leaderOf(u) {
        return rulerOf(u.data.faction) || superiorOf(u);
    }
    function membersOf(fid) {
        const W = World();
        fid = resolveFaction(fid);
        return W && fid ? W.units().filter(v => v.data && resolveFaction(v.data.faction) === fid && isTalkable(v)) : [];
    }
    /** What the unit is doing now: its job (UF_Jobs), else its intent (V48), else null. */
    function doingOf(u) {
        const J = Jobs();
        const job = J && J.of ? J.of(u.id) : null;
        if (job) {
            const other = job.params && typeof job.params.unitId === "number" ? unitById(job.params.unitId) : null;
            return { text: lowerFirst(J.describe(job)), job, other: other && other.id !== u.id && isTalkable(other) ? other : null };
        }
        const intent = u.data && u.data.intent;
        if (intent && intent.text) return { text: lowerFirst(intent.text), job: null, other: null };
        return null;
    }
    /**
     * The skill a unit is best at (data.skills: a number or { level } per skill), or null: none above 0, or no skill
     * standing out (all equal, as with the same starting level everywhere).
     */
    function bestSkill(u) {
        const sk = u && u.data ? u.data.skills : null;
        if (!sk || typeof sk !== "object") return null;
        let best = null, bestLv = -Infinity, floor = Infinity, count = 0;
        for (const k of Object.keys(sk).sort()) {
            const v = sk[k];
            const lv = typeof v === "number" ? v : v && typeof v.level === "number" ? v.level : null;
            if (lv === null) continue;
            count++;
            floor = Math.min(floor, lv);
            if (lv > bestLv) { best = k; bestLv = lv; }
        }
        return best && bestLv > 0 && (bestLv > floor || count === 1) ? best : null;
    }
    /** The unit's trade in words ("a woodcutter", "an archer") from its best skill and talk.lines.trades, or null. */
    function tradeOf(u) {
        const k = bestSkill(u);
        const trades = L("trades") || {};
        const noun = k && typeof trades[k] === "string" ? trades[k] : null;
        if (!noun) return null;
        return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
    }
    function homeOf(u) {
        const d = u.data || {};
        const H = History();
        const siteRec = id => (H && H.siteById && id !== undefined && id !== null ? H.siteById(id) : null);
        let s = siteRec(d.site);
        if (s && !s.ruined) return { site: s, x: s.x, y: s.y, area: s.area || u.area };
        if (isOwn(u)) {
            const C = Colonists();
            const cs = C && C.site ? C.site() : null;
            if (cs && typeof cs.x === "number") {
                s = siteRec(cs.id);
                return { site: s && !s.ruined ? s : null, x: cs.x, y: cs.y, area: cs.area || u.area };
            }
        }
        if (d.home && typeof d.home.x === "number") return { site: null, x: d.home.x, y: d.home.y, area: d.home.area || u.area };
        return null;
    }
    /** Factions the unit knows: yours knows the ones met; a stranger knows its friends, its enemies and you. At most 3. */
    function knownFactions(u) {
        const F = Factions();
        const mine = resolveFaction(u.data && u.data.faction);
        if (!F || !mine) return [];
        const pid = playerFactionId();
        let list = F.all().filter(f => f.id !== mine);
        if (isOwn(u)) list = list.filter(f => f.met);
        else list = list.filter(f => f.id === pid || Math.abs(F.relation(mine, f.id)) >= 15);
        list.sort((a, b) => Math.abs(F.relation(mine, b.id)) - Math.abs(F.relation(mine, a.id)) || (a.id < b.id ? -1 : 1));
        return list.slice(0, 3);
    }
    /** The newest chronicle event of the unit's faction (at its site first), else the newest one at a site within 40 cells. */
    function newsFor(u) {
        const H = History();
        if (!H || !H.events) return null;
        const d = u.data || {};
        const fid = resolveFaction(d.faction);
        let list = [];
        try { list = fid ? H.events({ faction: fid }) : []; } catch (e) { list = []; }
        if (list.length && d.site !== undefined && d.site !== null) {
            const here = list.filter(e => e.site === d.site);
            if (here.length) list = here;
        }
        if (!list.length) {
            let all = [];
            try { all = H.events({}); } catch (e) { all = []; }
            list = all.filter(e => {
                const s = e.site !== undefined && e.site !== null && H.siteById ? H.siteById(e.site) : null;
                return s && sameArea(s.area, u.area) && Math.max(Math.abs(s.x - u.x), Math.abs(s.y - u.y)) <= 40;
            });
        }
        const e = list.length ? list[list.length - 1] : null;
        return e && e.text ? e : null;
    }
    /** The need (hunger, thirst, sleep, social, nature) at or above talk.needAt that presses hardest, or null. */
    function topNeed(u) {
        const needs = u && u.data ? u.data.needs : null;
        if (!needs) return null;
        const at = typeof T().needAt === "number" ? T().needAt : 60;
        let top = null;
        for (const k of Object.keys(needs)) if (typeof needs[k] === "number" && needs[k] >= at && (!top || needs[k] > needs[top])) top = k;
        return top;
    }
    const shortName = name => String(name || "").replace(/^the\s+/i, "");
    const inSentence = name => String(name || "").replace(/^The\s+/, "the ");
    function directionWord(dx, dy) {
        const dirs = T().directions || {};
        const ang = Math.atan2(-dy, dx); // screen y grows southward
        const keys = ["e", "ne", "n", "nw", "w", "sw", "s", "se"];
        const k = keys[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
        return dirs[k] || k;
    }
    function whereText(u, place) {
        if (!place) return null;
        if (!sameArea(place.area || u.area, u.area)) return word("far", "far from here");
        const dx = place.x - u.x, dy = place.y - u.y;
        const dist = Math.round(Math.hypot(dx, dy));
        if (dist <= 2) return word("here", "right here");
        return word("where", "about {dist} paces to the {dir}").replace("{dist}", String(dist)).replace("{dir}", directionWord(dx, dy));
    }

    //-------------------------------------------------------------------------
    // Keywords, slots and topic words

    const personKw = p => ({ id: `person:${p.id}`, label: p.name, topic: "person", ref: p.id });
    const factionKw = f => ({ id: `faction:${f.id}`, label: shortName(f.name), topic: "faction", ref: f.id });
    const siteKw = s => ({ id: `site:${s.id}`, label: s.name, topic: "site", ref: s.id });
    const personSlot = p => (p ? { text: p.name, kw: personKw(p) } : null);
    const factionSlot = f => (f ? { text: inSentence(f.name), kw: factionKw(f) } : null);
    const siteSlot = s => (s && s.name ? { text: s.name, kw: siteKw(s) } : null);
    const needLabel = k => {
        const w = L("needWords") || {};
        return typeof w[k] === "string" ? w[k] : k;
    };
    /** A topic keyword: family, home, mood, others, news, or need:<need>. */
    function topicKw(id) {
        const [topic, ref] = id.split(":");
        if (topic === "need") return { id, label: needLabel(ref), topic: "need", ref };
        return { id, label: keywordLabels()[topic] || topic, topic, ref: null };
    }

    // What the speaker of the line being built has something on (the [topic] words a template may use).
    let ctx = { avail: new Set(), need: null };
    function contextFor(u) {
        const avail = new Set();
        const d = u.data || {};
        const st = stageOf(u);
        if (partnerOf(u) || childrenOf(u).length || motherOf(u) || fatherOf(u) || st === "adult" || st === "elder") avail.add("family");
        if (homeOf(u)) avail.add("home");
        if (d.mood || d.needs || (Array.isArray(d.thoughts) && d.thoughts.length)) avail.add("mood");
        if (knownFactions(u).length) avail.add("others");
        if (newsFor(u)) avail.add("news");
        const need = topNeed(u);
        if (need) avail.add("need");
        return { avail, need };
    }

    const SLOT_RE = /\{(\w+)\}/g;
    const MARK_RE = /\[([^\]|]+)(?:\|([^\]]+))?\]/g;
    const slotsIn = tpl => Array.from(String(tpl).matchAll(SLOT_RE), m => m[1]);
    const marksIn = tpl => Array.from(String(tpl).matchAll(MARK_RE), m => (m[2] || m[1]).trim());
    const has = (slots, k) => slots[k] !== undefined && slots[k] !== null && !(Array.isArray(slots[k]) && !slots[k].length);
    function listJoin(texts) {
        if (texts.length <= 1) return texts.join("");
        return `${texts.slice(0, -1).join(", ")} ${word("and", "and")} ${texts[texts.length - 1]}`;
    }
    const opensSentence = before => !before || /[.?!"]$/.test(before);
    /** Fill a template: [topic] words (the topic joins the keywords) and {slots} (a slot naming someone adds that keyword). */
    function fill(tpl, slots, adds) {
        const marked = String(tpl).replace(MARK_RE, (m, a, b) => {
            let topic = (b || a).trim();
            if (topic === "need") topic = ctx.need ? `need:${ctx.need}` : null;
            if (!topic) return m;
            const kw = topicKw(topic);
            adds.push(kw);
            return b ? a : kw.label;
        });
        return marked.replace(SLOT_RE, (m, key, offset) => {
            const s = slots[key];
            if (s === undefined || s === null) return m;
            let text;
            if (typeof s === "string" || typeof s === "number") text = String(s);
            else if (Array.isArray(s)) {
                for (const e of s) if (e && e.kw) adds.push(e.kw);
                text = listJoin(s.map(e => (e && e.text) || String(e)));
            } else {
                if (s.kw) adds.push(s.kw);
                text = String(s.text);
            }
            // A name that opens a sentence ("Good morrow. The ... are welcome") starts with a capital.
            return opensSentence(marked.slice(0, offset).trimEnd()) && !provoked("lines_well_formed") ? capFirst(text) : text;
        });
    }
    /**
     * One sentence from a template section: section[variant] for the first variant with a usable template (its slots
     * known and its [topic] words available), chosen by hash32(seed, unit, salt, section.key, n), so the same question
     * gets the same answer until it is asked again.
     */
    function say(section, variants, slots, unit, key, n, adds) {
        return sayIn(L(section), section, variants, slots, unit, key, n, adds);
    }
    /** say() on a given template section object; `label` names it in the choice hash. */
    function sayIn(sec, section, variants, slots, unit, key, n, adds) {
        const usable = list => (Array.isArray(list)
            ? list.filter(t => typeof t === "string" && slotsIn(t).every(k => has(slots, k)) && marksIn(t).every(k => ctx.avail.has(k)))
            : []);
        let list = [];
        if (Array.isArray(sec)) list = usable(sec);
        else if (sec && typeof sec === "object") {
            for (const v of variants) {
                list = usable(sec[v]);
                if (list.length) break;
            }
        }
        if (!list.length) return "";
        const i = hash32(seed(), unit.id, SALT_TALK, strHash(`${section}.${key}`), n | 0) % list.length;
        return capFirst(fill(list[i], slots, adds));
    }
    const join = parts => parts.filter(Boolean).join(" ");

    //-------------------------------------------------------------------------
    // The topics: each returns the line for a keyword, built from the state above

    function greetLine(u, n, adds) {
        const mode = modeOf(u);
        const F = Factions();
        const slots = { name: u.name, playerFaction: factionSlot(F && F.player ? F.player() : null), faction: factionSlot(factionOf(u)) };
        if (mode === "baby") return say("baby", [], slots, u, "greet", n, adds);
        if (mode === "hostile") return say("refuse", [], slots, u, "greet", n, adds);
        if (mode === "own") {
            const band = moodBand(u) || "fine";
            return say("greet", [`own_${band}`, "own_fine", "own"], slots, u, "greet", n, adds);
        }
        return say("greet", [mode, "wary"], slots, u, "greet", n, adds);
    }
    /** The rank title (V52): data.title, else talk.lines.titles.ruler / .leader by gender. */
    function titleOf(u) {
        const d = (u && u.data) || {};
        const rank = d.rank | 0;
        if (rank < 1) return null;
        if (typeof d.title === "string" && d.title) return d.title;
        const titles = L("titles") || {};
        const t = titles[rank >= 2 ? "ruler" : "leader"];
        if (!t) return rank >= 2 ? "ruler" : "leader";
        return typeof t === "string" ? t : t[d.gender === "female" ? "female" : "male"] || t.male || null;
    }
    function nameLine(u, n, adds) {
        const d = u.data || {};
        const f = factionOf(u);
        const stage = stageOf(u);
        const base = [];
        if ((d.rank | 0) >= 2) base.push("ruler");
        else if ((d.rank | 0) === 1) base.push("leader");
        if (stage === "child" || stage === "teen") base.push("child");
        base.push(f ? "default" : "nofaction", "nofaction");
        const variants = stanceOf(u) === "wary" ? base.map(v => `wary_${v}`).concat(base) : base;
        const name = provoked("name_job_bye") ? "someone" : u.name;
        const parts = [say("name", variants, { name, title: titleOf(u), faction: factionSlot(f) }, u, "name", n, adds)];
        if ((stage === "adult" || stage === "elder") && (partnerOf(u) || childrenOf(u).length)) parts.push(say("name", ["family"], {}, u, "name.family", n, adds));
        return join(parts);
    }
    function jobLine(u, n, adds) {
        const d = u.data || {};
        const doing = provoked("name_job_bye") ? { text: "working", other: null } : doingOf(u);
        const parts = [];
        if (doing) parts.push(say("job", ["busy"], { job: { text: doing.text, kw: doing.other ? personKw(doing.other) : null }, name: u.name }, u, "job", n, adds));
        else parts.push(say("job", ["idle"], { name: u.name }, u, "job", n, adds));
        const stage = stageOf(u);
        const trade = tradeOf(u);
        if (trade) parts.push(say("job", ["trade"], { trade }, u, "job.trade", n, adds));
        else if (stage === "adult" || stage === "elder") parts.push(say("job", ["noTrade"], {}, u, "job.trade", n, adds));
        const rank = d.rank | 0;
        if (rank >= 2) parts.push(say("job", ["ruler"], { faction: factionSlot(factionOf(u)) }, u, "job.role", n, adds));
        else if (rank === 1) parts.push(say("job", ["leader"], {}, u, "job.role", n, adds));
        const sup = superiorOf(u);
        if (sup && rank < 2) parts.push(say("job", ["superior"], { superior: personSlot(sup) }, u, "job.superior", n, adds));
        if (ctx.avail.has("home")) parts.push(say("job", ["home"], {}, u, "job.home", n, adds));
        if (ctx.need) parts.push(say("job", ["need"], {}, u, "job.need", n, adds));
        else if (ctx.avail.has("mood") && isOwn(u)) parts.push(say("job", ["moodHint"], {}, u, "job.mood", n, adds));
        return join(parts);
    }
    function familyLine(u, n, adds) {
        const parts = [];
        const partner = partnerOf(u);
        const kids = childrenOf(u);
        const stage = stageOf(u);
        if (partner) parts.push(say("family", ["partner"], { partner: personSlot(partner) }, u, "family.partner", n, adds));
        else if (stage === "adult" || stage === "elder") parts.push(say("family", ["noPartner"], {}, u, "family.partner", n, adds));
        if (kids.length) {
            const slots = { children: kids.map(personSlot), count: kids.length };
            parts.push(say("family", kids.length === 1 ? ["child", "children"] : ["children"], slots, u, "family.children", n, adds));
        } else if (stage === "adult" || stage === "elder") parts.push(say("family", ["noChildren"], {}, u, "family.children", n, adds));
        const mother = motherOf(u), father = fatherOf(u);
        if (mother) parts.push(say("family", ["mother"], { mother: personSlot(mother) }, u, "family.mother", n, adds));
        if (father) parts.push(say("family", ["father"], { father: personSlot(father) }, u, "family.father", n, adds));
        return join(parts) || say("family", ["none", "noPartner"], {}, u, "family", n, adds);
    }
    function homeLine(u, n, adds) {
        const home = homeOf(u);
        if (!home) return say("home", ["none"], {}, u, "home", n, adds);
        const slots = { home: siteSlot(home.site), where: whereText(u, home), faction: factionSlot(factionOf(u)) };
        return say("home", home.site && home.site.name ? ["site", "camp"] : ["camp"], slots, u, "home", n, adds);
    }
    function siteLine(u, id, n, adds) {
        const H = History();
        const s = H && H.siteById ? H.siteById(id) : null;
        if (!s) return say("unknown", [], {}, u, `site:${id}`, n, adds);
        const F = Factions();
        const f = F && s.faction ? F.get(s.faction) : null;
        const slots = { home: siteSlot(s), kind: s.kind || null, where: whereText(u, s), faction: factionSlot(f) };
        return say("site", ["default"], slots, u, `site:${id}`, n, adds) || say("unknown", [], {}, u, `site:${id}`, n, adds);
    }
    function moodLine(u, n, adds) {
        const d = u.data || {};
        const parts = [];
        const band = moodBand(u);
        if (band) parts.push(say("mood", [band, "fine"], { mood: String(d.mood).toLowerCase() }, u, "mood", n, adds));
        if (ctx.need) parts.push(say("mood", ["need"], {}, u, "mood.need", n, adds));
        const thought = Array.isArray(d.thoughts) && d.thoughts[0] && d.thoughts[0].text ? d.thoughts[0].text : null;
        if (thought) parts.push(say("mood", ["thought"], { thought }, u, "mood.thought", n, adds));
        return join(parts) || say("mood", ["unknown"], {}, u, "mood", n, adds);
    }
    function needLine(u, need, n, adds) {
        return say("needTopic", [need], {}, u, `need:${need}`, n, adds) || say("needs", [need], {}, u, `need:${need}`, n, adds);
    }
    function othersLine(u, n, adds) {
        const list = knownFactions(u);
        if (!list.length) return say("others", ["none"], {}, u, "others", n, adds);
        return say("others", ["list"], { factions: list.map(factionSlot) }, u, "others", n, adds);
    }
    function newsLine(u, n, adds) {
        const e = newsFor(u);
        if (!e) return say("news", ["none"], {}, u, "news", n, adds);
        const line = say("news", ["event"], { event: e.text }, u, "news", n, adds);
        // What the event names becomes a keyword too: its factions and its site.
        const F = Factions(), H = History();
        for (const fid of e.factions || []) {
            const f = F && F.get ? F.get(fid) : null;
            if (f && line.toLowerCase().includes(shortName(f.name).toLowerCase())) adds.push(factionKw(f));
        }
        const s = e.site !== undefined && e.site !== null && H && H.siteById ? H.siteById(e.site) : null;
        if (s && s.name && line.includes(s.name)) adds.push(siteKw(s));
        return line;
    }
    function factionLine(u, fid, n, adds) {
        const F = Factions();
        const f = F && F.get ? F.get(fid) : null;
        if (!f) return say("unknown", [], {}, u, `faction:${fid}`, n, adds);
        const mine = resolveFaction(u.data && u.data.faction);
        if (f.id === mine) {
            const parts = [];
            const people = F.speciesName ? String(F.speciesName(f.species)).toLowerCase() : String(f.species || "");
            parts.push(say("faction", ["own"], { faction: factionSlot(f), people, count: membersOf(f.id).length }, u, `faction:${fid}`, n, adds));
            const leader = leaderOf(u);
            if (leader && leader.id === u.id) parts.push(say("faction", ["leaderSelf"], {}, u, "faction.leader", n, adds));
            else if (leader) parts.push(say("faction", ["leader"], { leader: personSlot(leader) }, u, "faction.leader", n, adds));
            else parts.push(say("faction", ["noLeader"], {}, u, "faction.leader", n, adds));
            if (ctx.avail.has("others")) parts.push(say("faction", ["othersHint"], {}, u, "faction.others", n, adds));
            return join(parts);
        }
        const tier = mine ? F.tierBetween(mine, f.id).id : "neutral";
        return say("faction", [tier, "neutral"], { faction: factionSlot(f) }, u, `faction:${fid}`, n, adds);
    }
    function personLine(u, pid, n, adds, label) {
        const p = unitById(pid);
        if (!p) return say("person", ["gone"], { person: label || "them" }, u, `person:${pid}`, n, adds);
        const rels = [];
        if (p.id === u.id) rels.push("self");
        const partner = partnerOf(u);
        if (partner && partner.id === p.id) rels.push("partner");
        if (childrenOf(u).some(c => c.id === p.id)) rels.push("child");
        if (u.data.motherId === p.id) rels.push("mother");
        if (u.data.fatherId === p.id) rels.push("father");
        const ruler = rulerOf(u.data.faction);
        if (ruler && ruler.id === p.id) rels.push("leader");
        const sup = superiorOf(u);
        if (sup && sup.id === p.id) rels.push("superior");
        const mine = resolveFaction(u.data.faction);
        if (mine && resolveFaction(p.data && p.data.faction) === mine) rels.push("kin");
        rels.push("other");
        const slots = { person: personSlot(p), faction: factionSlot(factionOf(p)) };
        const parts = [say("person", rels, slots, u, `person:${pid}`, n, adds)];
        if (p.id !== u.id) {
            const doing = doingOf(p);
            if (doing) parts.push(say("person", ["busy"], { person: personSlot(p), personJob: { text: doing.text, kw: doing.other && doing.other.id !== u.id ? personKw(doing.other) : null } }, u, `person:${pid}.doing`, n, adds));
            else parts.push(say("person", ["idle"], { person: personSlot(p) }, u, `person:${pid}.doing`, n, adds));
        }
        return join(parts);
    }
    function byeLine(u, n, adds) {
        const mode = modeOf(u);
        return say("bye", [mode, "wary"], { name: u.name }, u, "bye", n, adds);
    }

    /** The line for a keyword id ("name", "job", "family", "need:hunger", "faction:f2", "person:17", "site:4", "greet", "bye", ...). */
    function lineFor(unitOrId, key, n = 0, label = "") {
        const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
        const adds = [];
        if (!u) return { text: "", adds, key };
        const saved = ctx;
        ctx = contextFor(u);
        try {
            const [topic, ref] = String(key).split(":");
            const refId = ref !== undefined && /^\d+$/.test(ref) ? Number(ref) : ref;
            let text = "";
            switch (topic) {
                case "greet": text = greetLine(u, n, adds); break;
                case "name": text = nameLine(u, n, adds); break;
                case "job": text = jobLine(u, n, adds); break;
                case "family": text = familyLine(u, n, adds); break;
                case "home": text = homeLine(u, n, adds); break;
                case "mood": text = moodLine(u, n, adds); break;
                case "need": text = needLine(u, String(ref), n, adds); break;
                case "others": text = othersLine(u, n, adds); break;
                case "news": text = newsLine(u, n, adds); break;
                case "faction": text = factionLine(u, refId, n, adds); break;
                case "person": text = personLine(u, refId, n, adds, label); break;
                case "site": text = siteLine(u, refId, n, adds); break;
                case "bye": text = byeLine(u, n, adds); break;
                default: text = say("unknown", [], {}, u, String(key), n, adds);
            }
            if (!text) text = say("unknown", [], {}, u, String(key), n, adds);
            if (provoked("no_banned_words")) text += ` ${"Ava" + "tar"}`;
            if (provoked("lines_well_formed")) text += " {unfilled}";
            if (provoked("keywords_grow")) adds.length = 0;
            return { text, adds, key: String(key) };
        } finally {
            ctx = saved;
        }
    }

    /** The keywords a talk starts with: name, job and bye (the greeting's topic words join after them). */
    function initialKeywords() {
        const K = keywordLabels();
        const kw = id => ({ id, label: K[id] || id, topic: id, ref: null, asked: false, isNew: false });
        if (provoked("name_job_bye")) return [kw("bye"), kw("name"), kw("job")];
        return [kw("name"), kw("job"), kw("bye")];
    }

    //-------------------------------------------------------------------------
    // Who speaks for you, and the companions who chime in (V62)

    /** Where a unit stands now: its event's cell on the map on screen, else its world cell. */
    function cellNow(v) {
        const W = World();
        const ev = W && W.eventOf ? W.eventOf(v.id) : null;
        return ev ? { x: ev.x, y: ev.y } : { x: v.x, y: v.y };
    }
    const cheb = (a, b) => {
        const p = cellNow(a), q = cellNow(b);
        return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
    };
    /** One of yours who can speak: talkable, not a baby, not the person spoken to. */
    const canSpeakFor = (v, u) => !!v && !!v.data && (!u || v.id !== u.id) && isOwn(v) && isTalkable(v) && stageOf(v) !== "baby";
    /**
     * Whoever speaks for you in a talk with `u` (there is no protagonist, V4): the colonist selected in the Overseer,
     * else your faction's ruler (the band leader), else your nearest grown person in the area. `{ unit, from }`, or
     * null (nobody: your portrait is then an emblem in your faction's colour).
     */
    function voiceOf(unitOrId) {
        const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
        const cm = window.$colonyManager;
        const s = cm && cm.selectedColonist && !provoked("voice") ? cm.selectedColonist : null;
        const sel = s ? unitById(s.id) : null;
        if (canSpeakFor(sel, u)) return { unit: sel, from: "selected" };
        const r = rulerOf(playerFactionId() || "player");
        if (canSpeakFor(r, u)) return { unit: r, from: "ruler" };
        const W = World();
        if (!W || !u) return null;
        let best = null, bd = Infinity;
        for (const v of W.units()) {
            if (!canSpeakFor(v, u) || !sameArea(v.area, u.area) || !["adult", "elder"].includes(stageOf(v))) continue;
            const d = cheb(v, u);
            if (d < bd || (d === bd && v.id < best.id)) { best = v; bd = d; }
        }
        return best ? { unit: best, from: "nearest" } : null;
    }
    const numOr = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
    /** The companions' two template sets: talk.chime (lines about a companion) and talk.lines.chime (remarks). */
    const aboutThem = () => {
        const c = T().chime;
        return c && typeof c === "object" && !Array.isArray(c) ? c : {};
    };
    const remarks = () => {
        const c = T().lines && T().lines.chime;
        return c && typeof c === "object" && !Array.isArray(c) ? c : {};
    };
    const chimeRange = () => numOr(remarks().range, numOr(aboutThem().range, CHIME_RANGE));
    const chimeChance = () => numOr(remarks().chance, numOr(aboutThem().chance, CHIME_CHANCE));
    /** The player's colonists (not the person, not whoever speaks for you, not babies or small children) within range, nearest first. */
    function companionsNear(unitOrId, voiceId = null) {
        const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
        const W = World();
        if (!u || !W) return [];
        const r = chimeRange();
        const out = [];
        for (const v of W.units()) {
            if (v.id === voiceId || !canSpeakFor(v, u) || stageOf(v) === "child" || !sameArea(v.area, u.area) || !W.eventOf(v.id)) continue;
            const d = cheb(v, u);
            if (d <= r) out.push({ v, d });
        }
        out.sort((a, b) => a.d - b.d || a.v.id - b.v.id);
        return out.map(e => e.v);
    }
    const withCtx = fn => {
        const saved = ctx;
        ctx = { avail: new Set(), need: null };
        try { return fn(); } finally { ctx = saved; }
    };
    const provokeText = text => {
        if (text && provoked("no_banned_words")) text += ` ${"Ava" + "tar"}`;
        if (text && provoked("lines_well_formed")) text += " {unfilled}";
        return text;
    };
    /**
     * What companion c says when the answer concerns them (talk.chime): the topic is them ("self"), the line names them
     * ("named"), the topic is their partner, child, mother or father, or a faction theirs is friendly or allied with
     * ("factionGood") or hostile to or at war with ("factionBad"). { variants, text, adds } or null.
     */
    function chimeAbout(c, u, key, n, lineAdds) {
        const [topic, ref] = String(key).split(":");
        const refId = ref !== undefined && /^\d+$/.test(ref) ? Number(ref) : ref;
        const named = new Set((lineAdds || []).filter(a => a && a.topic === "person").map(a => a.ref));
        const variants = [];
        const slots = { name: c.name, speaker: personSlot(u) };
        if (topic === "person" && refId === c.id) variants.push("self");
        else if (named.has(c.id)) variants.push("named");
        if (topic === "person" && refId !== c.id) {
            const p = unitById(refId);
            if (p) {
                slots.person = personSlot(p);
                const partner = partnerOf(c);
                if (partner && partner.id === p.id) variants.push("partner");
                if (childrenOf(c).some(k => k.id === p.id)) variants.push("child");
                if (c.data.motherId === p.id) variants.push("mother");
                if (c.data.fatherId === p.id) variants.push("father");
            }
        }
        const F = Factions();
        if (topic === "faction" && F && F.get) {
            const f = F.get(refId);
            const mine = resolveFaction(c.data.faction);
            if (f && mine && f.id !== mine) {
                const tier = F.tierBetween(mine, f.id).id;
                slots.faction = factionSlot(f);
                if (tier === "war" || tier === "hostile") variants.push("factionBad");
                else if (tier === "allied" || tier === "friendly") variants.push("factionGood");
            }
        }
        if (!variants.length) return null;
        const adds = [];
        const text = withCtx(() => sayIn(aboutThem(), "chime", variants, slots, c, `about.${key}`, n, adds));
        return text ? { variants, text: provokeText(text), adds } : null;
    }
    /** A remark by companion c about the topic or the person (talk.lines.chime): the topic's lines, then the person's stance, then any. */
    function chimeRemark(c, u, key, n) {
        const [topic, ref] = String(key).split(":");
        const variants = [];
        const slots = { name: c.name, speaker: personSlot(u) };
        if (topic === "faction") {
            const F = Factions();
            const f = F && F.get ? F.get(ref) : null;
            const mine = resolveFaction(u.data && u.data.faction);
            const theirs = resolveFaction(c.data && c.data.faction);
            if (f) {
                slots.faction = factionSlot(f);
                if (f.id === mine && mine === theirs) variants.push("faction_own");
                else if (theirs && f.id !== theirs) variants.push(`faction_${F.tierBetween(theirs, f.id).id}`);
            }
        } else if (topic === "person") {
            const p = unitById(Number(ref));
            if (p && p.id !== c.id) {
                slots.person = personSlot(p);
                variants.push("person");
            }
        } else if (topic === "need") variants.push("mood");
        else if (topic === "site") variants.push("home");
        else if (topic !== "greet") variants.push(topic);
        variants.push(stanceOf(u), "any");
        const adds = [];
        const text = withCtx(() => sayIn(remarks(), "chime.remark", variants, slots, c, `${u.id}.${key}`, n, adds));
        return text ? { variants, text: provokeText(text), adds } : null;
    }
    /**
     * What a companion says after the person answered keyword `key` (the n-th time; "greet" for the greeting), or null.
     * Pure and seeded. First the nearest companion the answer concerns (chimeAbout); otherwise, by a seeded chance
     * (talk.lines.chime.chance percent, hash32(seed, person, 0xc41e, key, n)), a remark by one of them picked by the
     * same hash (chimeRemark). Never on bye, never in a hostile or baby talk. { unitId, name, variants, text, adds, why }.
     */
    function chimeFor(unitOrId, key, n = 0, lineAdds = [], voiceId = null) {
        const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
        if (!u || provoked("companion_chimes_in")) return null;
        const mode = modeOf(u);
        if (key === "bye" || mode === "hostile" || mode === "baby") return null;
        const comps = companionsNear(u, voiceId);
        if (!comps.length) return null;
        for (const c of comps) {
            const r = chimeAbout(c, u, key, n, lineAdds);
            if (r) return Object.assign({ unitId: c.id, name: c.name, why: "about them" }, r);
        }
        const h = strHash(String(key));
        if (hash32(seed(), u.id, SALT_CHIME, h, n | 0) % 100 >= chimeChance()) return null;
        const c = comps[hash32(seed(), u.id, SALT_CHIME, h, n | 0, 1) % comps.length];
        const r = chimeRemark(c, u, key, n);
        return r ? Object.assign({ unitId: c.id, name: c.name, why: "remark" }, r) : null;
    }

    //-------------------------------------------------------------------------
    // Portraits: data.face; then the culture's face sheets and its people's species sheets (catalog "faces", VISION
    // V100, UF.Factions.cultureFace); then catalog.sheet.faces (the same pick as UF_Sheet's panel), then talk.portraits
    // (stock placeholders), else a code-drawn silhouette (UF_GenFace). Until the culture's sheets exist the portrait is
    // drawn in a code-drawn frame in the culture's colours (spec.frame, UF.Factions.drawPortrait).

    function faceList(list) {
        const out = [];
        const push = (sheet, index) => { if (sheet) out.push({ sheet: String(sheet), index: index | 0 }); };
        if (!list) return out;
        if (typeof list === "string") list = [list];
        if (!Array.isArray(list)) {
            if (list.sheet && Array.isArray(list.indices)) list.indices.forEach(i => push(list.sheet, i));
            else if (list.sheet) push(list.sheet, list.index);
            return out;
        }
        for (const e of list) {
            if (typeof e === "string") {
                const [sheet, index] = e.split(":");
                push(sheet, Number(index));
            } else if (Array.isArray(e)) push(e[0], e[1]);
            else if (e && e.sheet) {
                if (Array.isArray(e.indices)) e.indices.forEach(i => push(e.sheet, i));
                else push(e.sheet, e.index);
            }
        }
        return out;
    }
    function stagedFaces(byGender, stage) {
        if (!byGender) return [];
        if (Array.isArray(byGender) || typeof byGender === "string" || byGender.sheet) return faceList(byGender);
        const order = stage === "baby" ? ["baby", "child", "adult"] : stage === "teen" ? ["teen", "adult"] : [stage, "adult"];
        for (const s of order) {
            const l = faceList(byGender[s]);
            if (l.length) return l;
        }
        return [];
    }
    const faceOk = f => !!f && fileExists(`img/faces/${f.sheet}.png`);
    function portraitOf(u) {
        const d = (u && u.data) || {};
        if (d.face && d.face.sheet && faceOk(d.face)) return { kind: "face", sheet: String(d.face.sheet), index: d.face.index | 0, from: "data.face", frame: null };
        const F = Factions();
        const frameOf = () => (F && typeof F.faceFrameCulture === "function" ? F.faceFrameCulture(u) : null);
        const cf = F && typeof F.cultureFace === "function" ? F.cultureFace(u) : null;
        if (cf && faceOk(cf)) return { kind: "face", sheet: cf.sheet, index: cf.index, from: cf.from, culture: cf.culture, frame: cf.framed === false ? frameOf() : null };
        return Object.assign(olderPortraitOf(u), { frame: frameOf() });
    }
    /** The portraits chosen before VISION V100 (catalog sheet.faces, talk.portraits, UF_GenFace). */
    function olderPortraitOf(u) {
        const d = (u && u.data) || {};
        const cat = catalog() || {};
        const g = d.gender === "female" ? "female" : "male";
        const stage = stageOf(u);
        const pickHash = (list, from) => {
            const ok = list.filter(faceOk);
            if (!ok.length) return null;
            const f = ok[hash32(seed(), u.id, SALT_FACE) % ok.length];
            return { kind: "face", sheet: f.sheet, index: f.index, from };
        };
        // UF_Sheet's rule (docs/systems/UF_Sheet.md, Face): <stage>_<gender>, <gender>, any; unit.id mod the list.
        const sf = cat.sheet && cat.sheet.faces && d.species ? cat.sheet.faces[d.species] : null;
        if (sf && typeof sf === "object") {
            const gl = String(d.gender || "any").toLowerCase();
            const list = (d.stage && sf[`${String(d.stage).toLowerCase()}_${gl}`]) || sf[gl] || sf.any || null;
            const ok = faceList(list).filter(faceOk);
            if (ok.length) {
                const f = ok[Math.abs(u.id | 0) % ok.length];
                return { kind: "face", sheet: f.sheet, index: f.index, from: "catalog.sheet.faces" };
            }
        }
        const tp = T().portraits;
        if (tp && d.species && tp[d.species]) {
            const p = pickHash(stagedFaces(tp[d.species][g], stage), "catalog.talk.portraits");
            if (p) return p;
        }
        return { kind: "gen", name: "UF_GenFace", from: "code" };
    }

    const hexRgb = hex => {
        const n = parseInt(String(hex || "#ffffff").replace("#", ""), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const rgbHex = ([r, g, b]) => `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
    const mulColor = (a, b) => rgbHex(hexRgb(a).map((v, i) => (v * hexRgb(b)[i]) / 255));
    const shade = (hex, f) => rgbHex(hexRgb(hex).map(v => v * f));
    /** A code-drawn head-and-shoulders silhouette (UF_GenFace): species tint, faction colour on the shoulders, hair by gender and age. */
    function drawGenFace(bitmap, u, x, y, S) {
        const c = bitmap.context;
        const d = (u && u.data) || {};
        const stage = u ? stageOf(u) : "adult";
        const people = (catalog() && catalog().people) || {};
        const tint = people[d.species] && people[d.species].tint ? people[d.species].tint : "#ffffff";
        const skin = shade(mulColor("#b08a6a", tint), 0.8);
        const f = u ? factionOf(u) : null;
        const cloth = shade(f && f.color ? f.color : "#6a5a44", 0.5);
        const hairs = ["#2b1d14", "#4a3020", "#6e4b2a", "#1c1b1a", "#8a6a3c", "#7a3a22"];
        const hair = stage === "elder" ? "#aaa59a" : hairs[hash32(seed(), u ? u.id : 0, SALT_FACE, 1) % hairs.length];
        const long = d.gender === "female";
        const scale = stage === "baby" ? 0.62 : stage === "child" ? 0.78 : stage === "teen" ? 0.9 : 1;
        c.save();
        c.beginPath();
        c.rect(x, y, S, S);
        c.clip();
        const grad = c.createLinearGradient(0, y, 0, y + S);
        grad.addColorStop(0, "#3a342b");
        grad.addColorStop(1, "#14110d");
        c.fillStyle = grad;
        c.fillRect(x, y, S, S);
        c.translate(x + S / 2, y + S);
        c.scale((scale * S) / 144, (scale * S) / 144);
        c.translate(-72, -144);
        const ell = (ex, ey, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
        if (long) ell(72, 84, 33, 46, shade(hair, 0.8));
        ell(72, 152, 60, 44, cloth);
        c.fillStyle = shade(skin, 0.8);
        c.fillRect(62, 88, 20, 26);
        ell(72, 68, 25, 31, skin);
        c.fillStyle = hair;
        c.beginPath();
        c.ellipse(72, 54, 27, 21, 0, Math.PI, 0);
        c.fill();
        c.fillRect(45, 50, 6, long ? 40 : 16);
        c.fillRect(93, 50, 6, long ? 40 : 16);
        c.restore();
        if (bitmap._baseTexture && bitmap._baseTexture.update) bitmap._baseTexture.update();
        bitmap._ufName = "UF_GenFace";
    }

    /** A code-drawn shield in your faction's colour (UF_GenEmblem): your portrait when nobody of yours can speak. */
    function drawEmblem(bitmap, color, x, y, S) {
        const key = /^#[0-9a-f]{6}$/i.test(String(color || "")) ? String(color) : "#8a7050";
        const c = bitmap.context;
        c.save();
        c.beginPath();
        c.rect(x, y, S, S);
        c.clip();
        const grad = c.createLinearGradient(0, y, 0, y + S);
        grad.addColorStop(0, "#3b352d");
        grad.addColorStop(1, "#16130f");
        c.fillStyle = grad;
        c.fillRect(x, y, S, S);
        c.translate(x, y);
        c.scale(S / 144, S / 144);
        const shield = (inset, fill) => {
            c.fillStyle = fill;
            c.beginPath();
            c.moveTo(34 + inset, 26 + inset);
            c.lineTo(110 - inset, 26 + inset);
            c.lineTo(110 - inset, 70);
            c.quadraticCurveTo(110 - inset, 108 - inset, 72, 124 - inset * 1.4);
            c.quadraticCurveTo(34 + inset, 108 - inset, 34 + inset, 70);
            c.closePath();
            c.fill();
        };
        shield(0, shade(key, 0.45));
        shield(5, key);
        shield(14, shade(key, 1.2));
        c.restore();
        if (bitmap._baseTexture && bitmap._baseTexture.update) bitmap._baseTexture.update();
        bitmap._ufName = "UF_GenEmblem";
    }

    //-------------------------------------------------------------------------
    // The talk screen: sprites over the map (no windows). One per map scene, reused for every talk.

    const setFont = (b, size, italic = false) => {
        b.fontFace = FONT_FACE;
        b.fontSize = size;
        b.fontItalic = italic;
        b.fontBold = false;
        b.textColor = TEXT_COLOR;
        b.outlineColor = "rgba(0,0,0,0.85)";
        b.outlineWidth = 4;
    };
    /** The faint darkening behind text: nested rectangles, darker toward the middle, no edge line. */
    function dim(b, x, y, w, h) {
        for (let i = 0; i < DIM_STEPS; i++) {
            const d = i * 2;
            if (w - d * 2 > 0 && h - d * 2 > 0) b.fillRect(x + d, y + d, w - d * 2, h - d * 2, DIM_COLOR);
        }
        if (provoked("layout")) { // test-only: a bordered box, what the layout check must catch
            b.fillRect(x, y, w, 2, "#e8d8a8");
            b.fillRect(x, y + h - 2, w, 2, "#e8d8a8");
            b.fillRect(x, y, 2, h, "#e8d8a8");
            b.fillRect(x + w - 2, y, 2, h, "#e8d8a8");
        }
    }

    class TalkScreen {
        constructor(scene) {
            this.scene = scene;
            this.root = new Sprite();
            this.root._ufTalkScreen = true;
            this.root.visible = false;
            const gw = Graphics.width, gh = Graphics.height;
            this.x0 = MARGIN + FACE + GAP;                               // where text starts beside a portrait
            this.wordsW = Math.min(WORDS_MAX_W, gw - this.x0 - MARGIN + PAD_X);
            this.wordsH = PAGE_LINES * LINE_H + PAD_Y * 2;
            this.kwW = gw - this.x0 - MARGIN + PAD_X * 2 + KW_PAD;
            this.measure = newBitmap(8, 8);
            this.other = this.makeSlot(MARGIN, MARGIN);
            this.comp = this.makeSlot(MARGIN, COMP_Y);
            this.player = { face: new Sprite(newBitmap(FACE, FACE)), token: 0, faceInfo: null };
            this.kwBack = new Sprite(newBitmap(this.kwW, KW_MAX_ROWS * KW_LINE + PAD_Y * 2));
            this.root.addChild(this.player.face, this.kwBack);
            this.kwSprites = [];
            this.kwCache = new Map();
            this.kwRects = [];
            this.kwDrawn = null;
            if (provoked("layout")) { // test-only: the other person's slot at the bottom right, what the layout check must catch
                this.other.face.x = gw - MARGIN - FACE;
                this.other.face.y = gh - MARGIN - FACE;
            }
        }
        makeSlot(x, y) {
            const face = new Sprite(newBitmap(FACE, FACE));
            face.x = x;
            face.y = y;
            face.visible = false;
            const words = new Sprite(newBitmap(this.wordsW, this.wordsH));
            words.x = this.x0 - PAD_X;
            words.y = y - PAD_Y;
            words.visible = false;
            const more = new Sprite(this.makeMore());
            more.visible = false;
            this.root.addChild(face, words, more);
            return { face, words, more, token: 0, faceInfo: null, drawn: null };
        }
        /** The "more" mark: the catalog word talk.words.more (italic) and a small down-pointing triangle. */
        makeMore() {
            const label = word("more", "more");
            setFont(this.measure, 16, true);
            const lw = Math.ceil(this.measure.measureTextWidth(label)) + 4;
            const b = newBitmap(lw + 20, 22);
            setFont(b, 16, true);
            b.textColor = MORE_COLOR;
            b.drawText(label, 0, 0, lw, 22, "right");
            const c = b.context;
            c.fillStyle = MORE_COLOR;
            c.beginPath();
            c.moveTo(lw + 5, 8);
            c.lineTo(lw + 15, 8);
            c.lineTo(lw + 10, 15);
            c.closePath();
            c.fill();
            b._baseTexture.update();
            return b;
        }
        attach() {
            const s = this.scene;
            if (this.root.parent === s) s.removeChild(this.root); // back on top of anything added since
            s.addChild(this.root);
        }
        /** Draw a portrait into a slot's face bitmap (once per person; again only when a face sheet finishes loading). */
        drawFace(slot, u) {
            const b = slot.face.bitmap;
            const token = ++slot.token;
            b.clear();
            b.fillRect(0, 0, FACE, FACE, "#14110d");
            const F = Factions();
            const spec = u ? portraitOf(u) : { kind: "emblem", name: "UF_GenEmblem", from: "code (nobody of yours can speak)", frame: F && F.playerCulture ? F.playerCulture() : null };
            let drawn = spec.kind === "emblem" ? "emblem" : "gen", pending = false, src = null;
            if (spec.kind === "face") {
                src = ImageManager.loadFace(spec.sheet);
                if (src.isReady()) drawn = "face";
                else if (!(src.isError && src.isError())) {
                    pending = true;
                    src.addLoadListener(() => { if (slot.token === token && !(src.isError && src.isError())) this.drawFace(slot, u); });
                }
            }
            // The portrait into a box of the bitmap: the face cell, your emblem, or the code-drawn silhouette.
            const inner = (x, y, S) => {
                if (drawn === "face") {
                    const pw = ImageManager.faceWidth, ph = ImageManager.faceHeight;
                    b.blt(src, (spec.index % 4) * pw, Math.floor(spec.index / 4) * ph, pw, ph, x, y, S, S);
                } else if (drawn === "emblem") {
                    const pf = F && F.player ? F.player() : null;
                    drawEmblem(b, pf && pf.color ? pf.color : null, x, y, S);
                } else drawGenFace(b, u, x, y, S);
            };
            // VISION V100: until the culture's face sheets exist, the portrait sits in a frame in the culture's colours.
            if (spec.frame && F && typeof F.drawPortrait === "function") F.drawPortrait(b, 0, 0, FACE, spec.frame, inner);
            else inner(2, 2, FACE - 4);
            // VISION V99: each side of the talk in its own faction's skin: that skin's window frame around the portrait.
            const owner = F && typeof F.skinOwner === "function" ? F.skinOwner(u) : null;
            const skin = owner && typeof F.drawSkinFrame === "function" ? F.drawSkinFrame(b, 0, 0, FACE, FACE, owner, SKIN_CORNER) : null;
            if (!skin || !skin.drawn) for (const [x, y, w, h] of [[0, 0, FACE, 2], [0, FACE - 2, FACE, 2], [0, 0, 2, FACE], [FACE - 2, 0, 2, FACE]]) b.fillRect(x, y, w, h, FRAME_COLOR);
            if (skin && skin.pending) {
                pending = true;
                skin.skin.addLoadListener(() => { if (slot.token === token) this.drawFace(slot, u); });
            }
            slot.faceInfo = Object.assign({}, spec, { drawn, pending, unitId: u ? u.id : null, skin: owner && F.cultureOf ? F.cultureOf(owner) : null, skinDrawn: !!(skin && skin.drawn) });
            slot.face.visible = true;
        }
        /** Word-wrap text to a width (the measure bitmap carries the font). */
        wrap(text, width) {
            setFont(this.measure, FONT_SIZE);
            const words = String(text || "").split(/\s+/).filter(Boolean);
            const lines = [];
            let cur = "";
            for (const w of words) {
                const next = cur ? `${cur} ${w}` : w;
                if (!cur || this.measure.measureTextWidth(next) <= width) cur = next;
                else {
                    lines.push(cur);
                    cur = w;
                }
            }
            if (cur) lines.push(cur);
            return lines;
        }
        textWidth() { return this.wordsW - PAD_X * 2 - 4; }
        paginate(text) {
            const lines = this.wrap(text, this.textWidth());
            if (provoked("paging")) return [lines.slice(0, PAGE_LINES)];
            const pages = [];
            for (let i = 0; i < lines.length; i += PAGE_LINES) pages.push(lines.slice(i, i + PAGE_LINES));
            return pages.length ? pages : [[]];
        }
        /** Draw one page of words beside a portrait: the darkening sized to the text, then the lines; the "more" mark. */
        drawWords(slot, lines, more) {
            const b = slot.words.bitmap;
            b.clear();
            if (!lines || !lines.length) {
                slot.words.visible = false;
                slot.more.visible = false;
                slot.drawn = null;
                return;
            }
            setFont(b, FONT_SIZE);
            const tw = Math.ceil(Math.max(...lines.map(l => b.measureTextWidth(l))));
            const w = Math.min(b.width, tw + PAD_X * 2 + 4), h = lines.length * LINE_H + PAD_Y * 2;
            dim(b, 0, 0, w, h);
            lines.forEach((l, i) => b.drawText(l, PAD_X, PAD_Y + i * LINE_H, b.width - PAD_X, LINE_H, "left"));
            slot.words.visible = true;
            slot.more.visible = !!more;
            slot.more.opacity = 255;
            slot.more.x = slot.words.x + Math.max(w - 64, 0);
            slot.more.y = slot.words.y + h - 2;
            slot.drawn = { lines: lines.slice(), w, h, more: !!more };
        }
        hideSlot(slot) {
            slot.face.visible = false;
            slot.words.visible = false;
            slot.more.visible = false;
            slot.drawn = null;
            slot.faceInfo = null;
            slot.token++;
        }
        /** The bitmap of one keyword (white, tinted when drawn): cached per label, at most KW_CACHE per screen. */
        kwBitmap(label) {
            let b = this.kwCache.get(label);
            if (b) {
                this.kwCache.delete(label); // most recently used last
                this.kwCache.set(label, b);
                return b;
            }
            setFont(this.measure, KW_FONT);
            const w = Math.ceil(this.measure.measureTextWidth(label)) + KW_PAD * 2 + 2;
            b = newBitmap(w, KW_LINE);
            setFont(b, KW_FONT);
            b.textColor = "#ffffff";
            b.drawText(label, KW_PAD, 0, w - KW_PAD, KW_LINE, "left");
            this.kwCache.set(label, b);
            if (this.kwCache.size > KW_CACHE) {
                const inUse = new Set(this.kwSprites.filter(s => s.visible).map(s => s.bitmap));
                for (const [k, old] of this.kwCache) {
                    if (this.kwCache.size <= KW_CACHE) break;
                    if (inUse.has(old) || old === b) continue;
                    this.kwCache.delete(k);
                    old.destroy();
                }
            }
            return b;
        }
        /** Lay out the keywords beside the player's portrait (rows, the block anchored to the bottom) and the darkening behind them. */
        drawKeywords(list) {
            const gw = Graphics.width, gh = Graphics.height;
            const maxW = gw - this.x0 - MARGIN;
            const items = [];
            let x = 0, row = 0;
            for (const k of list) {
                const bmp = this.kwBitmap(k.label);
                if (x > 0 && x + bmp.width > maxW) {
                    row++;
                    x = 0;
                }
                items.push({ k, bmp, rx: x, row });
                x += bmp.width + KW_GAP;
            }
            const rows = Math.min(KW_MAX_ROWS, row + 1);
            const blockH = rows * KW_LINE;
            const top = gh - MARGIN - Math.max(FACE, blockH);
            this.player.face.x = MARGIN;
            this.player.face.y = provoked("layout") ? MARGIN : top; // provoked: the player's portrait at the top
            while (this.kwSprites.length < items.length) {
                const s = new Sprite();
                this.kwSprites.push(s);
                this.root.addChild(s);
            }
            this.kwRects = [];
            let widest = 0;
            items.forEach((it, i) => {
                const s = this.kwSprites[i];
                s.bitmap = it.bmp;
                s.x = this.x0 + it.rx - KW_PAD;
                s.y = top + it.row * KW_LINE;
                s.visible = it.row < KW_MAX_ROWS;
                if (s.visible) widest = Math.max(widest, it.rx + it.bmp.width);
                this.kwRects.push({ id: it.k.id, label: it.k.label, x: s.x, y: s.y, w: it.bmp.width, h: KW_LINE, visible: s.visible });
            });
            for (let i = items.length; i < this.kwSprites.length; i++) this.kwSprites[i].visible = false;
            const kb = this.kwBack.bitmap;
            kb.clear();
            this.kwBack.x = this.x0 - PAD_X - KW_PAD;
            this.kwBack.y = top - PAD_Y;
            if (items.length) dim(kb, 0, 0, Math.min(kb.width, widest + PAD_X * 2), Math.min(kb.height, blockH + PAD_Y * 2));
            this.kwDrawn = { top, rows, widest };
        }
        /** Tint and opacity of the keywords: asked ones dimmed, the selected one highlighted, all faint while reading. */
        styleKeywords(list, sel, active) {
            this.kwSprites.forEach((s, i) => {
                if (!s.visible) return;
                const k = list[i];
                const hi = active && i === sel;
                const tint = hi ? KW_TINT_HOVER : k && k.asked ? KW_TINT_ASKED : KW_TINT;
                const op = !active ? 90 : hi ? 255 : k && k.asked ? 165 : 255;
                if (s.tint !== tint) s.tint = tint;
                if (s.opacity !== op) s.opacity = op;
            });
        }
        hitKeyword(x, y) {
            for (let i = 0; i < this.kwRects.length; i++) {
                const r = this.kwRects[i];
                if (r.visible && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return i;
            }
            return -1;
        }
        show() {
            this.attach();
            this.root.visible = true;
        }
        hide() {
            this.root.visible = false;
            this.hideSlot(this.comp);
        }
    }

    function mapScene() {
        const s = SceneManager._scene;
        return s instanceof Scene_Map && s._spriteset ? s : null;
    }
    function screenFor(scene) {
        if (!scene) return null;
        if (!scene._ufTalkScreen) scene._ufTalkScreen = new TalkScreen(scene);
        return scene._ufTalkScreen;
    }

    //-------------------------------------------------------------------------
    // Over-head lines (refusals, farewells, babble): UF.Speech.say when it exists, else a small pooled fallback here:
    // plain text over the speaker's head in the tilemap (z 900000, below the fog), kept screen-size at any zoom, fading.

    let lastOverHead = null;
    function ohPool() {
        const s = mapScene();
        if (!s || !s._spriteset._tilemap) return null;
        const ss = s._spriteset;
        if (!ss._ufTalkOH) ss._ufTalkOH = [];
        return ss._ufTalkOH;
    }
    function drawOverHead(sp, text) {
        const b = sp.bitmap;
        b.clear();
        setFont(b, 18);
        const words = String(text).split(/\s+/).filter(Boolean);
        const lines = [];
        let cur = "";
        for (const w of words) {
            const next = cur ? `${cur} ${w}` : w;
            if (!cur || b.measureTextWidth(next) <= OH_W - 12) cur = next;
            else { lines.push(cur); cur = w; }
        }
        if (cur) lines.push(cur);
        const shown = lines.slice(-2);
        const y0 = OH_H - shown.length * 24 - 2;
        shown.forEach((l, i) => b.drawText(l, 0, y0 + i * 24, OH_W, 24, "center"));
    }
    function characterSpriteOf(ev) {
        const s = mapScene();
        const list = s && s._spriteset ? s._spriteset._characterSprites || [] : [];
        for (const sp of list) if (sp._character === ev) return sp;
        return null;
    }
    function placeOverHead(sp) {
        const W = World();
        const ev = W ? W.eventOf(sp._ufUnitId) : null;
        if (!ev) { sp.visible = false; return; }
        const z = Camera() && Camera().zoom ? Camera().zoom() : 1;
        if (!sp._ufChar || sp._ufChar._character !== ev) sp._ufChar = characterSpriteOf(ev);
        const h = sp._ufChar && sp._ufChar.patternHeight ? sp._ufChar.patternHeight() : 48;
        sp.x = ev.screenX();
        sp.y = ev.screenY() - Math.max(24, h || 48) - 2;
        const k = 1 / (z || 1);
        if (sp.scale.x !== k) sp.scale.set(k, k);
    }
    function sayOverHead(unitOrId, text, frames = OH_FRAMES) {
        const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
        if (!u || !text) return null;
        // UF.Speech.say(speaker, text, { frames, kind }) returns the ids of the lines it shows, or null when it can't.
        const S = window.UF && UF.Speech;
        if (S && typeof S.say === "function") {
            try {
                const r = S.say(u.id, text, { frames, kind: "remark" });
                if (Array.isArray(r) ? r.length > 0 : !!r) {
                    lastOverHead = { via: "UF.Speech", unitId: u.id, text: String(text), ids: Array.isArray(r) ? r.slice() : r };
                    return lastOverHead;
                }
            } catch (e) { /* fall back to our own line */ }
        }
        const pool = ohPool();
        const W = World();
        if (!pool || !W || !W.eventOf(u.id)) return null;
        let sp = pool.find(s => s.visible && s._ufUnitId === u.id) || pool.find(s => !s.visible) || null;
        if (!sp && pool.length < OH_POOL) {
            sp = new Sprite(newBitmap(OH_W, OH_H));
            sp.anchor.set(0.5, 1);
            sp.z = OH_Z;
            mapScene()._spriteset._tilemap.addChild(sp);
            pool.push(sp);
        }
        if (!sp) sp = pool.reduce((a, b) => (a._ufLeft <= b._ufLeft ? a : b));
        drawOverHead(sp, text);
        sp._ufUnitId = u.id;
        sp._ufText = String(text);
        sp._ufLeft = frames;
        sp.opacity = 255;
        sp.visible = true;
        placeOverHead(sp);
        lastOverHead = { via: "fallback", unitId: u.id, text: String(text), sprite: sp };
        return lastOverHead;
    }
    function tickOverHead() {
        const s = SceneManager._scene;
        const pool = s && s._spriteset ? s._spriteset._ufTalkOH : null;
        if (!pool) return;
        for (const sp of pool) {
            if (!sp.visible) continue;
            if (--sp._ufLeft <= 0) { sp.visible = false; continue; }
            if (sp._ufLeft < OH_FADE) sp.opacity = Math.round((255 * sp._ufLeft) / OH_FADE);
            placeOverHead(sp);
        }
    }

    //-------------------------------------------------------------------------
    // The conversation (view state: not saved; the facts it shows are read from the saved world)

    let convo = null;
    let lastSocial = null;
    let lastRefusal = null;
    let spaceQueued = false;
    let viewFrame = 0;         // a view counter for the "more" mark's blink (not simulation)
    const tickStats = { frames: 0, ms: 0 };

    function addKeyword(add, u) {
        if (!add || !add.id || !convo) return false;
        if (add.topic === "person" && add.ref === u.id) return false; // not themselves
        if (convo.keywords.some(k => k.id === add.id)) return false;
        convo.keywords.push(Object.assign({ asked: false }, add, { isNew: true }));
        return true;
    }
    const isChoosing = () => !!convo && convo.phase === "choosing";
    function renderKeywords() {
        if (!convo) return;
        convo.screen.drawKeywords(convo.keywords);
        convo.screen.styleKeywords(convo.keywords, convo.sel, isChoosing());
    }
    /** Draw the current page; with the last page, the companion's line (if one chimes in) appears in its slot. */
    function renderPage() {
        const sc = convo.screen;
        const last = convo.page >= convo.pages.length - 1;
        sc.drawWords(sc.other, convo.pages[convo.page] || [], !last);
        if (last && convo.chime && !convo.chime.shown) {
            const c = unitById(convo.chime.unitId);
            convo.chime.shown = true;
            sc.drawFace(sc.comp, c);
            sc.drawWords(sc.comp, sc.wrap(convo.chime.text, sc.textWidth()).slice(0, PAGE_LINES), false);
            emit("talk:chimed", c, unitById(convo.unitId), convo.chime.text);
        }
        convo.phase = last ? "choosing" : "reading";
        sc.styleKeywords(convo.keywords, convo.sel, isChoosing());
    }
    /** Show an answer: paginated; the chime (if any) appears with its last page. Input waits INPUT_DELAY frames. */
    function present(text, chime) {
        convo.text = text;
        convo.pages = convo.screen.paginate(text);
        convo.page = 0;
        convo.chime = chime ? Object.assign({ shown: false }, chime) : null;
        convo.inputDelay = Math.max(convo.inputDelay, INPUT_DELAY);
        convo.screen.hideSlot(convo.screen.comp);
        renderPage();
    }
    /** The companion's line joins the talk: what it names becomes keywords too. */
    function takeChime(chime, u) {
        if (!chime) return null;
        if (!provoked("keywords_grow")) for (const a of chime.adds || []) addKeyword(a, u);
        return chime;
    }

    const Talk = {
        FACE, PAGE_LINES, SOCIAL_RELIEF, BANNED, OH_Z, OH_FRAMES, INPUT_DELAY,
        isTalkable,
        isOwn,
        stanceOf,
        modeOf,
        stageOf,
        lineFor,
        initialKeywords: () => initialKeywords().map(k => Object.assign({}, k)),
        portraitOf,
        templates: () => T(),
        section: L,
        companionsNear,
        /** Ids of the companions near a person (their API name before 2026-09-19 noon). */
        companionsOf: (unitOrId, voiceId = null) => companionsNear(unitOrId, voiceId).map(v => v.id),
        chimeFor,
        chimeAbout,
        chimeRemark,
        /** Whoever speaks for you in a talk with this person: { unitId, name, from } (from: selected, ruler, nearest), or null. */
        voiceOf(unitOrId) {
            const v = voiceOf(unitOrId);
            return v ? { unitId: v.unit.id, name: v.unit.name, from: v.from } : null;
        },
        tradeOf,
        titleOf,
        facts(unitOrId) {
            const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
            if (!u) return null;
            const doing = doingOf(u), home = homeOf(u), news = newsFor(u), partner = partnerOf(u), leader = leaderOf(u), sup = superiorOf(u);
            return {
                id: u.id, name: u.name, mode: modeOf(u), stage: stageOf(u), faction: factionOf(u) ? factionOf(u).id : null,
                doing: doing ? doing.text : null, trade: tradeOf(u), title: titleOf(u), partner: partner ? partner.id : null, children: childrenOf(u).map(c => c.id),
                leader: leader ? leader.id : null, superior: sup ? sup.id : null, home: home ? { x: home.x, y: home.y, site: home.site ? home.site.id : null } : null,
                knows: knownFactions(u).map(f => f.id), news: news ? news.text : null, need: topNeed(u)
            };
        },
        /**
         * Open a conversation with a person (unit or id). Returns current(), or null: not talkable, not on the map, or it
         * refuses (hostile: the refusal floats over its head) or babbles (a baby). Pauses the world.
         */
        open(unitOrId) {
            const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
            const scene = mapScene();
            if (!u || !isTalkable(u) || !scene) return null;
            if (convo) Talk.closeNow();
            const mode = modeOf(u);
            if (mode === "hostile" || mode === "baby") {
                const text = lineFor(u, "greet", 0).text;
                const oh = sayOverHead(u, text);
                lastRefusal = { unitId: u.id, mode, text, via: oh ? oh.via : null };
                emit("talk:refused", u, mode, text);
                return null;
            }
            const screen = screenFor(scene);
            const voice = voiceOf(u);
            convo = {
                unitId: u.id, mode, stance: stanceOf(u), playerId: voice ? voice.unit.id : null, voiceFrom: voice ? voice.from : "emblem",
                keywords: initialKeywords(), asked: {}, text: "", pages: [[]], page: 0, phase: "choosing", chime: null, sel: 0, inputDelay: INPUT_DELAY,
                pausedByTalk: false, layerWas: null, screen, lastPX: TouchInput.x, lastPY: TouchInput.y
            };
            const greet = lineFor(u, "greet", 0);
            for (const a of greet.adds) addKeyword(a, u);
            const chime = takeChime(chimeFor(u, "greet", 0, greet.adds, convo.playerId), u);
            for (const k of convo.keywords) k.isNew = false; // the greeting's words are there from the start
            screen.drawFace(screen.other, u);
            screen.drawFace(screen.player, voice ? voice.unit : null);
            renderKeywords();
            present(greet.text, chime);
            screen.show();
            // The talk is the whole screen: the other windows (the colonist card, the selection panel) step aside.
            const Sh = window.UF && UF.Sheet;
            if (Sh && typeof Sh.isOpen === "function" && Sh.isOpen() && typeof Sh.close === "function") Sh.close();
            if (scene._windowLayer) {
                convo.layerWas = scene._windowLayer.visible;
                scene._windowLayer.visible = false;
            }
            const Tm = Time();
            if (Tm && !Tm.paused && !provoked("pause_and_resume")) convo.pausedByTalk = Tm.pause() !== false;
            emit("talk:opened", u, mode);
            return Talk.current();
        },
        /** Ask about a keyword (id, or label, case-insensitive). Returns the answer, or null (nothing open, unknown keyword). "bye" ends the talk. */
        ask(which) {
            if (!Talk.isOpen()) return null;
            const want = String(which === undefined || which === null ? "" : which).toLowerCase();
            const kw = convo.keywords.find(k => k.id === which) || convo.keywords.find(k => k.id.toLowerCase() === want || k.label.toLowerCase() === want);
            if (!kw) return null;
            const u = unitById(convo.unitId);
            if (!u) {
                Talk.closeNow();
                return null;
            }
            const n = convo.asked[kw.id] || 0;
            convo.asked[kw.id] = n + 1;
            kw.asked = true;
            if (kw.id === "bye") {
                const bye = lineFor(u, "bye", n).text;
                emit("talk:asked", u, "bye", bye);
                Talk.closeNow();
                sayOverHead(u, bye);
                return bye;
            }
            const res = lineFor(u, kw.id, n, kw.label);
            for (const k of convo.keywords) k.isNew = false;
            for (const a of res.adds) addKeyword(a, u);
            const chime = takeChime(chimeFor(u, kw.id, n, res.adds, convo.playerId), u);
            renderKeywords();
            present(res.text, chime);
            emit("talk:asked", u, kw.id, res.text);
            return res.text;
        },
        /** A topic joins the open talk's keywords as if it had been mentioned (e.g. "mood", "need:hunger", "faction:f2", "person:17"). */
        learn(id) {
            if (!Talk.isOpen()) return false;
            const u = unitById(convo.unitId);
            const s = String(id);
            const [topic, ref] = s.split(":");
            let kw = null;
            if (["family", "home", "mood", "others", "news", "need"].includes(topic)) kw = topicKw(s);
            else if (topic === "person" && unitById(Number(ref))) kw = personKw(unitById(Number(ref)));
            else if (topic === "faction" && Factions() && Factions().get(ref)) kw = factionKw(Factions().get(ref));
            if (!kw || !addKeyword(kw, u)) return false;
            renderKeywords();
            return true;
        },
        /** The next page of the answer (a click, Enter or Space does this). Returns true if it turned a page. */
        next() {
            if (!Talk.isOpen() || convo.phase !== "reading") return false;
            convo.page = Math.min(convo.pages.length - 1, convo.page + 1);
            renderPage();
            return true;
        },
        /** Jump to the last page (a right-click or Esc while pages remain). Returns true if it moved. */
        skip() {
            if (!Talk.isOpen() || convo.phase !== "reading") return false;
            convo.page = convo.pages.length - 1;
            renderPage();
            return true;
        },
        /** Pages of the current answer still to come. */
        pagesLeft: () => (Talk.isOpen() ? Math.max(0, convo.pages.length - 1 - convo.page) : 0),
        /** Close now (no farewell). The world runs again if this talk paused it. */
        closeNow() {
            if (!convo) return false;
            const c = convo;
            convo = null;
            c.screen.hide();
            const scene = mapScene();
            if (scene && c.screen.scene === scene && scene._windowLayer && c.layerWas !== null) scene._windowLayer.visible = c.layerWas;
            const u = unitById(c.unitId);
            if (u && isOwn(u) && Object.keys(c.asked).some(k => k !== "bye")) Talk.easeSocial(u);
            const Tm = Time();
            if (c.pausedByTalk && Tm && Tm.paused) Tm.resume();
            emit("talk:closed", u || null);
            return true;
        },
        /** Say goodbye (asks "bye": the farewell floats over their head, the talk closes). */
        close() {
            if (!Talk.isOpen()) return false;
            Talk.ask("bye");
            return true;
        },
        /** Eases your colonist's social need through UF_Colonists' public API when it has one. */
        easeSocial(u) {
            const C = Colonists();
            if (C && typeof C.satisfyNeed === "function") {
                C.satisfyNeed(u, "social", SOCIAL_RELIEF);
                lastSocial = { unitId: u.id, applied: true, via: "UF.Colonists.satisfyNeed" };
            } else lastSocial = { unitId: u.id, applied: false, reason: "UF_Colonists has no public API to change a need (satisfyNeed)" };
            return lastSocial;
        },
        lastSocial: () => (lastSocial ? Object.assign({}, lastSocial) : null),
        lastRefusal: () => (lastRefusal ? Object.assign({}, lastRefusal) : null),
        sayOverHead,
        lastOverHead: () => (lastOverHead ? Object.assign({}, lastOverHead) : null),
        /** The fallback over-head lines on screen: [{ unitId, text, sprite }]. */
        overHead() {
            const pool = ohPool() || [];
            return pool.filter(s => s.visible).map(s => ({ unitId: s._ufUnitId, text: s._ufText, sprite: s }));
        },
        isOpen() {
            if (!convo) return false;
            const scene = mapScene();
            if (!scene || convo.screen.scene !== scene || convo.screen.root.parent !== scene) { // the scene changed under it
                const c = convo;
                convo = null;
                const Tm = Time();
                if (c.pausedByTalk && Tm && Tm.paused) Tm.resume();
                return false;
            }
            return true;
        },
        /** A copy of the open conversation, or null. */
        current() {
            if (!Talk.isOpen()) return null;
            const u = unitById(convo.unitId);
            return {
                unitId: convo.unitId, name: u ? u.name : "", mode: convo.mode, stance: convo.stance, playerId: convo.playerId,
                voice: { unitId: convo.playerId, name: convo.playerId !== null && unitById(convo.playerId) ? unitById(convo.playerId).name : "", from: convo.voiceFrom },
                text: convo.text, pages: convo.pages.map(p => p.slice()), page: convo.page, phase: convo.phase,
                more: convo.page < convo.pages.length - 1, chime: convo.chime ? Object.assign({}, convo.chime) : null,
                pausedByTalk: convo.pausedByTalk, asked: Object.assign({}, convo.asked), sel: convo.sel,
                keywords: convo.keywords.map(k => Object.assign({}, k))
            };
        },
        keywords: () => (Talk.isOpen() ? convo.keywords.map(k => k.label) : []),
        line: () => (Talk.isOpen() ? convo.text : ""),
        page: () => (Talk.isOpen() ? { index: convo.page, count: convo.pages.length, lines: (convo.pages[convo.page] || []).slice(), more: convo.page < convo.pages.length - 1 } : null),
        screen: () => (Talk.isOpen() ? convo.screen : null),
        /** Where everything is on the screen (screen pixels), and what was drawn. */
        layout() {
            if (!Talk.isOpen()) return null;
            const sc = convo.screen;
            const rect = s => ({ x: s.x, y: s.y, w: s.bitmap ? s.bitmap.width : 0, h: s.bitmap ? s.bitmap.height : 0, visible: s.visible });
            const slot = s => ({ face: rect(s.face), faceInfo: s.faceInfo ? Object.assign({}, s.faceInfo) : null, words: rect(s.words), drawn: s.drawn ? JSON.parse(JSON.stringify(s.drawn)) : null, more: s.more.visible, moreRect: rect(s.more) });
            return {
                other: slot(sc.other), comp: slot(sc.comp),
                player: { face: rect(sc.player.face), faceInfo: sc.player.faceInfo ? Object.assign({}, sc.player.faceInfo) : null, unitId: convo.playerId, keywords: sc.kwRects.map(r => Object.assign({}, r)), back: rect(sc.kwBack) },
                screen: { w: Graphics.width, h: Graphics.height }
            };
        },
        /** Per frame (from Scene_Map.update): input for the open talk, the over-head fallback lines. */
        tick() {
            const t0 = performance.now();
            try {
                Talk.tickBody();
            } finally {
                if (provoked("perf")) {
                    const until = performance.now() + 2;
                    while (performance.now() < until) { /* test-only busy wait */ }
                    if (convo) newBitmap(4, 4).destroy(); // test-only: a Bitmap per frame
                }
                tickStats.frames++;
                tickStats.ms += performance.now() - t0;
            }
        },
        stats: () => Object.assign({}, tickStats),
        resetStats() { tickStats.frames = 0; tickStats.ms = 0; },
        bitmapsMade: () => bitmapsMade,
        tickBody() {
            tickOverHead();
            if (!convo) { spaceQueued = false; return; }
            if (!Talk.isOpen()) return;
            viewFrame++;
            const sc = convo.screen;
            if (sc.other.more.visible) {
                const op = (viewFrame >> 4) & 1 ? 150 : 255;
                if (sc.other.more.opacity !== op) sc.other.more.opacity = op;
            }
            if (convo.inputDelay > 0) {
                convo.inputDelay--;
                spaceQueued = false;
                convo.lastPX = TouchInput.x;
                convo.lastPY = TouchInput.y;
                return;
            }
            const okKey = Input.isTriggered("ok") || spaceQueued;
            spaceQueued = false;
            const click = TouchInput.isTriggered();
            if (TouchInput.isCancelled() || Input.isTriggered("cancel")) {
                if (convo.phase === "reading") Talk.skip(); // the last page first; the next right-click or Esc says bye
                else Talk.ask("bye");
                return;
            }
            if (convo.phase === "reading") {
                if (click || okKey) Talk.next();
                return;
            }
            const px = TouchInput.x, py = TouchInput.y;
            if (px !== convo.lastPX || py !== convo.lastPY) {
                convo.lastPX = px;
                convo.lastPY = py;
                const i = sc.hitKeyword(px, py);
                if (i >= 0 && i !== convo.sel) {
                    convo.sel = i;
                    sc.styleKeywords(convo.keywords, convo.sel, true);
                }
            }
            const move = d => {
                const n = convo.keywords.length;
                if (!n) return;
                convo.sel = (convo.sel + d + n) % n;
                sc.styleKeywords(convo.keywords, convo.sel, true);
                SoundManager.playCursor();
            };
            const moveRow = d => {
                const r = sc.kwRects[convo.sel];
                if (!r) return;
                let best = -1, bestD = Infinity;
                sc.kwRects.forEach((q, i) => {
                    if (!q.visible || Math.sign(q.y - r.y) !== d) return;
                    const dist = Math.abs(q.y - r.y) * 1000 + Math.abs(q.x + q.w / 2 - (r.x + r.w / 2));
                    if (dist < bestD) { bestD = dist; best = i; }
                });
                if (best >= 0) {
                    convo.sel = best;
                    sc.styleKeywords(convo.keywords, convo.sel, true);
                    SoundManager.playCursor();
                }
            };
            if (Input.isRepeated("right") || Input.isRepeated("cameraRight")) move(1);
            else if (Input.isRepeated("left") || Input.isRepeated("cameraLeft")) move(-1);
            else if (Input.isRepeated("down") || Input.isRepeated("cameraDown")) moveRow(1);
            else if (Input.isRepeated("up") || Input.isRepeated("cameraUp")) moveRow(-1);
            if (click) {
                const i = sc.hitKeyword(px, py);
                if (i >= 0) {
                    convo.sel = i;
                    Talk.ask(convo.keywords[i].id);
                }
                return;
            }
            if (okKey && convo.keywords[convo.sel]) Talk.ask(convo.keywords[convo.sel].id);
        },
        /** The context-menu entry for a cell (or null): used by the UF.Interact wrap. */
        optionFor(x, y) {
            const Lk = Look();
            const hit = Lk && Lk.unitAt ? Lk.unitAt(x, y) : null;
            const u = hit && hit.unit;
            let ok = !!u && isTalkable(u);
            if (provoked("option_listed")) ok = !!u && !!u.data && u.data.kind === "creature";
            if (!ok) return null;
            const label = String(T().optionLabel || FALLBACK.optionLabel).replace("{name}", u.name);
            return { id: "talk", label, enabled: true, unitId: u.id, run: () => Talk.open(u.id) };
        },
        /** The options with Talk added before the unit's own entries (a cell's top-level list only). */
        withTalk(options, x, y) {
            if (!Array.isArray(options) || !options.length) return options;
            if (options.some(o => o && o.id === "talk") || !options.some(o => o && o.id === "look")) return options;
            const opt = Talk.optionFor(x, y);
            if (!opt) return options;
            const out = options.slice();
            let at = out.findIndex(o => ["hunt", "select", "follow", "info"].includes(o.id));
            if (at < 0) at = out.findIndex(o => ["build", "stockpile", "dig", "fish", "drink", "cancel", "look"].includes(o.id));
            out.splice(at < 0 ? out.length : at, 0, opt);
            return out;
        }
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Talk = Talk;

    //-------------------------------------------------------------------------
    // Hooks: the Talk entry in UF_Interact's menu, input while talking, the per-frame tick, Space

    function hookInteract() {
        const I = Interact();
        if (!I || I._ufTalkHooked) return !!I;
        I._ufTalkHooked = true;
        const _optionsFor = I.optionsFor;
        I.optionsFor = function(x, y) {
            return Talk.withTalk(_optionsFor.call(this, x, y), x, y);
        };
        // While a talk is open the map takes no mouse input: no context menu, no select, move, deselect or camera
        // panning (the Overseer's controls run only when this returns false).
        const _handleMouse = I.handleMouse;
        I.handleMouse = function() {
            if (Talk.isOpen()) return true;
            return _handleMouse.apply(this, arguments);
        };
        // A talk is modal: the whole screen counts as UI, so UF_Look's map tooltip stays hidden and UF_Sheet opens nothing.
        const Lk = Look();
        if (Lk && typeof Lk.isOverUI === "function" && !Lk._ufTalkHooked) {
            Lk._ufTalkHooked = true;
            const _isOverUI = Lk.isOverUI;
            Lk.isOverUI = function() {
                if (Talk.isOpen()) return true;
                return _isOverUI.apply(this, arguments);
            };
        }
        // UF.Interact.open builds its list with its own (unwrapped) optionsFor, so the window gets Talk here.
        const MW = I.MenuWindow;
        if (MW && MW.prototype) {
            const _init = MW.prototype.initialize;
            MW.prototype.initialize = function(rect, options, header, cell) {
                let opts = options;
                if (cell) {
                    const aug = Talk.withTalk(options, cell.x, cell.y);
                    if (aug !== options) {
                        opts = aug;
                        rect = I.menuRect(aug, header, rect.x, rect.y, false);
                    }
                }
                _init.call(this, rect, opts, header, cell);
            };
            const _setOptions = MW.prototype.setOptions;
            MW.prototype.setOptions = function(options, header) {
                const c = this._cell;
                _setOptions.call(this, c ? Talk.withTalk(options, c.x, c.y) : options, header);
            };
        }
        return true;
    }
    hookInteract();

    // Space turns the page or asks while a talk is open: taken in the capture phase at the window, before UF_TimeSpeed's
    // document listener (which would toggle the pause) and before RMMZ's Input sees it.
    window.addEventListener("keydown", e => {
        if (e.code !== "Space" || !convo || provoked("pause_and_resume")) return;
        if (!Talk.isOpen()) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        if (!e.repeat) spaceQueued = true;
    }, true);

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        Talk.tick();
    };

    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        if (convo && convo.screen.scene === this) Talk.closeNow();
        _Scene_Map_terminate.call(this);
    };

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        hookInteract();
        if (testActive()) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "talk")

    function registerChecks() {
        UF.Test.suite("talk", async t => {
            const errors0 = t.errorsSoFar().length;
            // A real uncaught error stops RMMZ (SceneManager.onError), so the provocation records one in the harness's list.
            if (provoked("no_errors")) UF.Test.errors.push("window.error: TEST provoked error (UF_Talk TestProvoke)");
            const W = World(), F = Factions(), I = Interact(), J = Jobs(), C = Colonists(), Tm = Time();
            const K = keywordLabels();
            const NAMES = ["option_listed", "layout", "pause_and_resume", "name_job_bye", "voice", "paging", "keywords_grow", "companion_chimes_in", "hostile_refuses_over_head", "lines_well_formed", "no_banned_words", "perf"];
            const done = new Set();
            const check = (name, ok, detail) => { done.add(name); return t.check(name, ok, detail); };
            const fx = { units: [], relations: [], met: null, partner: null, rank: null, thoughts: null, pausedByTest: false, sel: undefined };
            const cellOf = u => {
                const ev = W.eventOf(u.id);
                return ev ? { x: ev.x, y: ev.y } : { x: u.x, y: u.y };
            };
            const centerOn = u => {
                const c = cellOf(u);
                $gameMap.setDisplayPos(c.x - $gameMap.screenTileX() / 2 + 0.5, c.y - $gameMap.screenTileY() * 0.5 + 0.5);
            };
            const tplRegex = tpl => new RegExp(`^${String(tpl).replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\\[[^\]]*\\\]/g, ".+?").replace(/\{\w+\}/g, ".+?")}$`, "i");
            const fromTemplates = (line, list) => (Array.isArray(list) ? list : []).some(tpl => tplRegex(tpl).test(String(line || "")));
            const pause = () => { if (Tm && !Tm.paused) Tm.pause(); fx.pausedByTest = true; };
            const run = () => { if (Tm && Tm.paused) Tm.resume(); fx.pausedByTest = false; };
            const ink = (b, x, y, w, h, minA = 200) => {
                x = Math.max(0, Math.floor(x));
                y = Math.max(0, Math.floor(y));
                w = Math.min(b.width - x, Math.floor(w));
                h = Math.min(b.height - y, Math.floor(h));
                if (w <= 0 || h <= 0) return 0;
                const d = b.context.getImageData(x, y, w, h).data;
                let n = 0;
                for (let i = 3; i < d.length; i += 4) if (d[i] >= minA) n++;
                return n;
            };
            const click = async (x, y) => {
                TouchInput._onTrigger(x, y);
                await t.waitFrames(1);
                TouchInput._onRelease(x, y);
                await t.waitFrames(2);
            };
            const pressSpace = async () => {
                document.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true }));
                await t.waitFrames(1);
                document.dispatchEvent(new KeyboardEvent("keyup", { code: "Space", key: " ", bubbles: true }));
                await t.waitFrames(2);
            };
            const readAll = () => { let g = 0; while (Talk.next() && g++ < 20) { /* turn every page */ } };
            const waitFaces = async what => {
                try {
                    await t.waitUntil(() => {
                        const l = Talk.layout();
                        return !!l && !!l.other.faceInfo && !l.other.faceInfo.pending && !!l.player.faceInfo && !l.player.faceInfo.pending;
                    }, 5000, what);
                } catch (e) { /* the checks report it */ }
            };

            try {
                let ready = true;
                try {
                    await t.waitUntil(() => W && W.currentArea() && I && F && C && C.list().some(u => sameArea(u.area, W.currentArea()) && W.eventOf(u.id)), 20000, "colonists on the map");
                } catch (e) {
                    ready = false;
                }
                if (!ready) {
                    for (const n of NAMES) check(n, false, `not ready: area ${W && W.currentArea() ? "yes" : "no"}, UF.Interact ${!!I}, UF.Factions ${!!F}, UF.Colonists ${!!C}, colonists here ${C ? C.list().length : 0}`);
                    return;
                }
                const area = W.currentArea();
                pause();
                await t.waitFrames(2);
                if (window.$colonyManager && $colonyManager.deselect) {
                    fx.sel = $colonyManager.selectedColonist ? $colonyManager.selectedColonist.id : null;
                    $colonyManager.deselect();
                }

                // The people: A (an adult colonist, not the ruler), A's partner, the leader; strangers, a hare and a companion placed by the test.
                const adultStage = u => ["adult", "elder"].includes(stageOf(u));
                const cols = C.list().filter(u => sameArea(u.area, area) && W.eventOf(u.id) && isAlive(u));
                const rankTop = fid => {
                    let best = null;
                    for (const v of W.units()) {
                        const d = v.data;
                        if (!d || resolveFaction(d.faction) !== fid || !isAlive(v) || (d.rank | 0) < 1) continue;
                        if (!best || (d.rank | 0) > (best.data.rank | 0) || ((d.rank | 0) === (best.data.rank | 0) && v.id < best.id)) best = v;
                    }
                    return best;
                };
                const topOf = u => rankTop(resolveFaction(u.data.faction));
                const A = cols.find(u => adultStage(u) && topOf(u) !== u) || cols.find(u => topOf(u) !== u) || cols[0];
                const fid = resolveFaction(A.data.faction);
                let leader = rankTop(fid) || unitById(idOf(A.data.superior));
                let partner = unitById(idOf(A.data.partner));
                const partnerFrom = partner ? "state" : "set by the test";
                if (!partner) {
                    partner = cols.find(u => u !== A && u !== leader && adultStage(u) && u.data.gender !== A.data.gender) || cols.find(u => u !== A && u !== leader) || null;
                    if (!partner) {
                        partner = W.addUnit({ name: "TEST_partner", image: { characterName: A.image.characterName, characterIndex: 0 }, area, x: A.x + 1, y: A.y, snapToFree: 6,
                            data: { kind: "person", faction: A.data.faction, species: A.data.species, gender: A.data.gender === "male" ? "female" : "male", age: 30, ai: null } });
                        fx.units.push(partner);
                    }
                    fx.partner = { unit: A, had: Object.prototype.hasOwnProperty.call(A.data, "partner"), old: A.data.partner };
                    A.data.partner = partner.id;
                }
                const leaderFrom = leader ? "state" : "set by the test";
                if (!leader) {
                    leader = cols.find(u => u !== A && u !== partner && adultStage(u)) || partner;
                    fx.rank = { unit: leader, had: Object.prototype.hasOwnProperty.call(leader.data, "rank"), old: leader.data.rank };
                    leader.data.rank = 2;
                }
                const faction = F.get(fid);
                const others = F.all().filter(f => f.id !== fid);
                const fFriend = others[0], fHostile = others[1] || others[0];
                fx.met = F.all().map(f => [f.id, f.met]);
                for (const f of [fFriend, fHostile]) if (!fx.relations.some(r => r[0] === f.id)) fx.relations.push([f.id, F.relation("player", f.id)]);
                F.setRelation("player", fFriend.id, 30);
                const peopleImage = sp => {
                    const p = catalog() && catalog().people && catalog().people[sp];
                    return p && Array.isArray(p.images) && p.images[0] ? p.images[0] : "$U7_Townsman";
                };
                const spawn = (name, dx, dy, data, image, snap = 6) => {
                    const u = W.addUnit({ name, image: { characterName: image, characterIndex: 0 }, area, x: A.x + dx, y: A.y + dy, dir: 2, snapToFree: snap, data });
                    fx.units.push(u);
                    return u;
                };
                const unspawn = u => {
                    if (u && W.unit(u.id)) W.removeUnit(u.id);
                    const i = fx.units.indexOf(u);
                    if (i >= 0) fx.units.splice(i, 1);
                };
                const tradeKeys = Object.keys(L("trades") || {});
                const stranger = spawn("TEST_talker", 5, 3, Object.assign({ kind: "person", faction: fFriend.id, species: fFriend.species, gender: "female", age: 34, ai: null }, tradeKeys.length ? { skills: { [tradeKeys[0]]: 12 } } : {}), peopleImage(fFriend.species));
                const grump = spawn("TEST_grump", -5, 3, { kind: "person", faction: fHostile.id, species: fHostile.species, gender: "male", age: 40, ai: null }, peopleImage(fHostile.species));
                const hareSp = catalog() && catalog().wildlife && Array.isArray(catalog().wildlife.species) ? catalog().wildlife.species.find(s => s.id === "hare") : null;
                const hare = spawn("TEST_hare", 0, 6, { kind: "creature", species: "hare", tags: ["grazer"], ai: null }, hareSp && hareSp.image ? hareSp.image : "$U7_Hare");
                await t.waitUntil(() => [stranger, grump, hare].every(u => W.eventOf(u.id)), 3000, "the test units' events");
                await t.waitFrames(2);

                // talk.option_listed: Talk on a person's cell (colonist and stranger), never on an animal's; in the real menu too.
                {
                    const ca = cellOf(A), cs = cellOf(stranger), ch = cellOf(hare);
                    const oA = I.optionsFor(ca.x, ca.y), oS = I.optionsFor(cs.x, cs.y), oH = I.optionsFor(ch.x, ch.y);
                    const tA = oA.find(o => o.id === "talk"), tS = oS.find(o => o.id === "talk"), tH = oH.find(o => o.id === "talk");
                    const menu = I.open(ca.x, ca.y, { x: 120, y: 90 });
                    const menuLabels = menu ? menu.labels() : [];
                    I.close();
                    const ok = !!tA && tA.unitId === A.id && !!tS && tS.unitId === stranger.id && !tH && oH.some(o => o.id === "hunt") && menuLabels.some(l => /^talk/i.test(l));
                    check("option_listed", ok, `colonist ${A.name} at (${ca.x},${ca.y}): ${tA ? `"${tA.label}"` : "NO Talk"}; stranger at (${cs.x},${cs.y}): ${tS ? `"${tS.label}"` : "NO Talk"}; `
                        + `hare at (${ch.x},${ch.y}): ${tH ? `"${tH.label}" (should not be there)` : "no Talk"}, options [${oH.map(o => o.id).join(", ")}]; real menu rows [${menuLabels.join(" | ")}]`);
                }

                // Open a talk with the friendly stranger from the real menu while the world runs (layout, then pause part 1).
                centerOn(stranger);
                run();
                await t.waitFrames(6);
                const layer0 = SceneManager._scene._windowLayer;
                const layerKids0 = layer0 ? layer0.children.slice() : [];
                const cS = cellOf(stranger);
                const menuS = I.open(cS.x, cS.y, { x: 120, y: 90 });
                if (menuS) I.choose("Talk");
                const openedByMenu = Talk.isOpen() && Talk.current().unitId === stranger.id;
                if (!openedByMenu) Talk.open(stranger.id); // so the rest can still run; the checks below record the failure
                const pausedWhileOpen = !!(Tm && Tm.paused);
                const pausedByTalk = !!(Talk.current() && Talk.current().pausedByTalk);
                await waitFaces("the talk's portraits");
                await t.waitFrames(3);

                // talk.layout
                {
                    const Lk = Look();
                    const px = TouchInput._x, py = TouchInput._y;
                    TouchInput._x = Math.round(Graphics.width / 2);
                    TouchInput._y = Math.round(Graphics.height / 2);
                    await t.waitFrames(3);
                    const tipSprite = Lk && Lk.sprite ? Lk.sprite() : null;
                    const tipHidden = !tipSprite || !tipSprite.visible || !tipSprite.worldVisible;
                    TouchInput._x = px;
                    TouchInput._y = py;
                    const lay = Talk.layout();
                    const sc = Talk.screen();
                    const gh = Graphics.height;
                    const why = [];
                    let detail = "";
                    if (!lay || !sc) why.push("no talk screen");
                    else {
                        const o = lay.other, p = lay.player;
                        const faceInk = ink(sc.other.face.bitmap, 20, 20, FACE - 40, FACE - 40, 250);
                        const topLeft = o.face.visible && o.face.x <= 40 && o.face.y <= 40 && o.face.w === FACE && o.face.h === FACE && faceInk > 400;
                        if (!topLeft) why.push(`other portrait at (${o.face.x},${o.face.y}) ${o.face.w}x${o.face.h} visible ${o.face.visible}, ${faceInk} opaque px in its middle`);
                        const wb = sc.other.words.bitmap, d = o.drawn;
                        const beside = o.words.visible && !!d && o.words.x + PAD_X >= o.face.x + o.face.w && o.words.y < o.face.y + o.face.h && o.words.y + (d ? d.h : 0) > o.face.y;
                        const textInk = d ? ink(wb, 0, 0, d.w, d.h, 200) : 0;
                        if (!beside || textInk < 150) why.push(`words at (${o.words.x},${o.words.y}) beside the portrait ${beside}, ${textInk} inked px`);
                        // The darkening: translucent inside, and no drawn border (every edge pixel dark and fainter than the middle).
                        let edgeBright = 0, edgeAlphaMax = 0, midA = 0;
                        if (d) {
                            const data = wb.context.getImageData(0, 0, d.w, d.h).data;
                            const at = (x, y) => (y * d.w + x) * 4;
                            const edge = (x, y) => {
                                const i = at(x, y);
                                edgeBright = Math.max(edgeBright, data[i], data[i + 1], data[i + 2]);
                                edgeAlphaMax = Math.max(edgeAlphaMax, data[i + 3]);
                            };
                            for (let x = 0; x < d.w; x++) { edge(x, 0); edge(x, d.h - 1); }
                            for (let y = 0; y < d.h; y++) { edge(0, y); edge(d.w - 1, y); }
                            midA = data[at(7, Math.floor(d.h / 2)) + 3];
                        }
                        const dimOk = !!d && midA >= 40 && midA <= 200 && edgeAlphaMax < midA && edgeBright <= 40;
                        if (!dimOk) why.push(`darkening: middle alpha ${midA}, edge alpha max ${edgeAlphaMax}, edge brightness max ${edgeBright} (a border would be bright)`);
                        const pInk = ink(sc.player.face.bitmap, 20, 20, FACE - 40, FACE - 40, 250);
                        const lower = p.face.visible && p.face.x <= 40 && p.face.y >= gh / 2 && pInk > 400 && p.face.y > o.face.y + FACE;
                        if (!lower) why.push(`player portrait at (${p.face.x},${p.face.y}) visible ${p.face.visible}, ${pInk} opaque px`);
                        const kws = p.keywords.filter(k => k.visible);
                        const kwBeside = kws.length >= 3 && kws.every(k => k.x >= p.face.x + FACE && k.y >= p.face.y - 2 && k.y + k.h <= gh);
                        const first3 = kws.slice(0, 3).map(k => k.label).join(",") === [K.name, K.job, K.bye].join(",");
                        const kwInk = kws.length ? ink(sc.kwSprites[0].bitmap, 0, 0, kws[0].w, kws[0].h, 200) : 0;
                        if (!kwBeside || !first3 || kwInk < 30) why.push(`keywords [${kws.map(k => `${k.label}@${k.x},${k.y}`).join(" ")}] beside ${kwBeside}, name/job/bye first ${first3}, ${kwInk} inked px in the first`);
                        // No dialog window: the talk is sprites; the window layer got nothing and is out of the way.
                        const layer = SceneManager._scene._windowLayer;
                        const added = layer ? layer.children.filter(ch => !layerKids0.includes(ch)) : [];
                        const foreign = added.filter(ch => !(I.MenuWindow && ch instanceof I.MenuWindow)); // the context menu that chose Talk may still be closing
                        const noWin = !(sc.root instanceof Window) && !sc.root.children.some(ch => ch instanceof Window) && !foreign.length && (!layer || !layer.visible);
                        if (!noWin) why.push(`windows: the screen is ${sc.root.constructor.name}, windows added to the window layer other than the closing menu: ${foreign.map(w => w.constructor.name).join(", ") || "none"}, layer visible ${layer ? layer.visible : "-"}`);
                        if (!tipHidden) why.push("UF_Look's tooltip visible over the talk");
                        if (!openedByMenu) why.push("Talk from the real menu did not open the talk");
                        if (d) detail = `other portrait ${o.faceInfo ? `${o.faceInfo.drawn} ${o.faceInfo.sheet || o.faceInfo.name}${o.faceInfo.sheet ? `:${o.faceInfo.index}` : ""} (${o.faceInfo.from})` : "?"} at (${o.face.x},${o.face.y}) ${FACE}x${FACE}, ${faceInk} opaque px; `
                            + `words at (${o.words.x},${o.words.y}) ${d.w}x${d.h}, ${textInk} inked px, "${d.lines.join(" / ")}"; darkening middle alpha ${midA}, edge alpha max ${edgeAlphaMax}, edge brightness ${edgeBright}; `
                            + `player portrait (#${p.unitId}, voice from ${Talk.current() ? Talk.current().voice.from : "?"}, ${p.faceInfo ? `${p.faceInfo.drawn} ${p.faceInfo.from}` : "?"}) at (${p.face.x},${p.face.y}); keywords [${kws.map(k => `${k.label}@${k.x},${k.y}`).join(" ")}]; screen is a ${sc.root.constructor.name}, window layer hidden ${layer ? !layer.visible : "-"}`;
                    }
                    check("layout", why.length === 0, why.length ? `${why.join("; ")}${detail ? ` | ${detail}` : ""}` : detail);
                }

                // talk.pause_and_resume (part 1): the world stands still while the talk is open; Space asks instead of unpausing.
                const tick0 = Tm ? Tm.ticks() : 0;
                await t.waitFrames(20);
                const tick1 = Tm ? Tm.ticks() : 0;
                const cur0 = Talk.current();
                const selId = cur0 ? cur0.keywords[cur0.sel].id : "";
                const askedBeforeSpace = cur0 ? cur0.asked[selId] || 0 : 0;
                await pressSpace();
                const spaceAsked = Talk.current() ? (Talk.current().asked[selId] || 0) > askedBeforeSpace : false;
                const pausedAfterSpace = !!(Tm && Tm.paused);
                readAll();

                // talk.name_job_bye (with the friendly stranger): name, job, bye first; name and job answers from the state; bye closes.
                {
                    const kwIds = Talk.current() ? Talk.current().keywords.map(k => k.id) : [];
                    const first3 = kwIds.slice(0, 3).join(",") === "name,job,bye";
                    const nameText = Talk.ask("name") || "";
                    readAll();
                    const job = J && J.of ? J.of(stranger.id) : null;
                    const doing = job ? lowerFirst(J.describe(job)) : stranger.data.intent && stranger.data.intent.text ? lowerFirst(stranger.data.intent.text) : null;
                    const jobText = Talk.ask("job") || "";
                    readAll();
                    const trade = tradeOf(stranger);
                    const idleOk = !doing && ((L("job") || {}).idle || []).some(tpl => jobText.startsWith(tpl));
                    const jobOk = (doing ? jobText.toLowerCase().includes(doing.toLowerCase()) : idleOk) && !!trade && jobText.includes(trade);
                    // A ranked person says their title with their name (V52).
                    const title = titleOf(leader);
                    const leaderName = lineFor(leader, "name", 0).text;
                    const titleOk = !!title && leaderName.includes(leader.name) && leaderName.includes(title);
                    await t.waitFrames(2);
                    t.screenshot("stranger");
                    const shotNote = `screenshot after "job": "${(Talk.page() || { lines: [] }).lines.join(" / ")}", keywords [${Talk.keywords().join(", ")}]`;
                    const byeText = Talk.ask("bye") || "";
                    await t.waitFrames(2);
                    const closed = !Talk.isOpen() && !Talk.screen();
                    const oh = Talk.lastOverHead();
                    const byeOk = closed && byeText.length > 0 && fromTemplates(byeText, (L("bye") || {}).friendly) && !!oh && oh.unitId === stranger.id && oh.text === byeText;
                    check("name_job_bye", openedByMenu && first3 && nameText.includes(stranger.name) && jobOk && titleOk && byeOk,
                        `keywords at the start [${kwIds.join(", ")}] (name, job, bye first: ${first3}); name: "${nameText}"; doing now: ${doing ? `"${doing}"` : "nothing (idle)"}, trade ${trade ? `"${trade}"` : "none"}; job: "${jobText}"; `
                        + `leader ${leader.name} (rank ${leader.data.rank | 0}, title "${title}", ${leaderFrom}): "${leaderName}"; bye: "${byeText}", talk closed ${closed}, over the head via ${oh ? oh.via : "nothing"}${oh && oh.unitId === stranger.id ? "" : " (not the stranger)"}; ${shotNote}`);
                }

                // talk.pause_and_resume (part 2 and 3): running again after bye; a talk opened while paused leaves it paused.
                {
                    const resumed = !!Tm && !Tm.paused;
                    const tk2 = Tm ? Tm.ticks() : 0;
                    await t.waitFrames(30);
                    const tk3 = Tm ? Tm.ticks() : 0;
                    pause();
                    await t.waitFrames(2);
                    const o2 = Talk.open(stranger.id);
                    const pausedBefore2 = !!(o2 && !o2.pausedByTalk && Tm && Tm.paused);
                    Talk.ask("bye");
                    const stillPaused = !!(Tm && Tm.paused);
                    check("pause_and_resume", pausedWhileOpen && pausedByTalk && tick1 === tick0 && spaceAsked && pausedAfterSpace && resumed && tk3 - tk2 >= 10 && pausedBefore2 && stillPaused,
                        `opened while running: paused ${pausedWhileOpen} (by the talk ${pausedByTalk}), ticks ${tick0}→${tick1} over 20 frames; Space asked "${selId}" ${spaceAsked}, still paused after Space ${pausedAfterSpace}; `
                        + `after bye running ${resumed}, ticks +${tk3 - tk2} over 30 frames; opened while paused: not paused by the talk ${pausedBefore2}, still paused after bye ${stillPaused}`);
                }

                // talk.paging: a long answer (A's newest thought, made long by the test) spans pages; a click shows the next page.
                pause();
                {
                    const d = A.data;
                    fx.thoughts = { unit: A, had: Object.prototype.hasOwnProperty.call(d, "thoughts"), old: Array.isArray(d.thoughts) ? d.thoughts.slice() : d.thoughts };
                    const long = "TEST_ The river was high this morning and the ford was gone, so we carried the stones the long way round by the old ash trees, "
                        + "and by the time we reached the camp the fire had burned low, the bread was cold, and nobody could agree on who should have watched it.";
                    d.thoughts = [{ text: long, strength: 0 }].concat(Array.isArray(fx.thoughts.old) ? fx.thoughts.old : []);
                    centerOn(A);
                    // talk.voice: with another colonist selected in the Overseer, that colonist is your portrait.
                    const B = cols.find(u => u !== A && canSpeakFor(u, A) && u.id !== (voiceOf(A) || { unit: {} }).unit.id) || cols.find(u => u !== A && canSpeakFor(u, A)) || null;
                    if (B && window.$colonyManager && $colonyManager.select) $colonyManager.select(B.id);
                    Talk.open(A.id);
                    await waitFaces("A's portrait");
                    {
                        const cv = Talk.current(), lv = Talk.layout();
                        const vInk = Talk.screen() ? ink(Talk.screen().player.face.bitmap, 20, 20, FACE - 40, FACE - 40, 250) : 0;
                        const ok = !!B && !!cv && cv.voice.from === "selected" && cv.playerId === B.id && !!lv.player.faceInfo && lv.player.faceInfo.unitId === B.id && vInk > 400;
                        check("voice", ok, `${B ? `${B.name} (#${B.id}) selected` : "no other colonist to select"}: voice ${cv ? `#${cv.playerId} ${cv.voice.name} (from ${cv.voice.from})` : "none"}, portrait drawn for #${lv && lv.player.faceInfo ? lv.player.faceInfo.unitId : "-"} (${lv && lv.player.faceInfo ? `${lv.player.faceInfo.drawn} ${lv.player.faceInfo.from}` : "-"}), ${vInk} opaque px in its middle`);
                        if (window.$colonyManager && $colonyManager.deselect) $colonyManager.deselect();
                    }
                    Talk.learn("mood");
                    const moodText = Talk.ask("mood") || "";
                    await t.waitFrames(3);
                    const c0 = Talk.current();
                    const lay0 = Talk.layout();
                    const drawn0 = lay0 && lay0.other.drawn ? lay0.other.drawn.lines.slice() : [];
                    const more0 = !!lay0 && lay0.other.more;
                    const kwFaint = Talk.screen() ? Talk.screen().kwSprites.filter(s => s.visible).every(s => s.opacity <= 120) : false;
                    t.screenshot("paging");
                    await click(Math.round(Graphics.width / 2), Math.round(Graphics.height / 2));
                    const c1 = Talk.current();
                    const lay1 = Talk.layout();
                    const drawn1 = lay1 && lay1.other.drawn ? lay1.other.drawn.lines.slice() : [];
                    const pages = c0 ? c0.pages : [];
                    const allText = pages.map(p => p.join(" ")).join(" ");
                    const whole = allText === moodText.split(/\s+/).join(" ");
                    const ok = pages.length >= 2 && c0.page === 0 && drawn0.join("|") === pages[0].join("|") && more0 && kwFaint && c0.phase === "reading"
                        && !!c1 && c1.page === 1 && drawn1.join("|") === (pages[1] || []).join("|") && whole;
                    check("paging", ok, `mood answer ${moodText.length} chars in ${pages.length} page(s) of up to ${PAGE_LINES} lines; page 0 drawn "${drawn0.join(" / ")}", more mark ${more0}, keywords faint ${kwFaint}, phase ${c0 ? c0.phase : "-"}; `
                        + `after a click: page ${c1 ? c1.page : "-"} drawn "${drawn1.join(" / ")}"; every word on some page ${whole}`);
                    readAll();
                }

                // talk.keywords_grow: asking "name" adds the faction and "family"; asking "family" adds the partner by name.
                {
                    const before = Talk.current().keywords.map(k => k.id);
                    const nameText = Talk.ask("name") || "";
                    readAll();
                    const afterName = Talk.current().keywords.map(k => k.id);
                    const famText = Talk.ask("family") || "";
                    readAll();
                    const after = Talk.current().keywords;
                    const pKw = after.find(k => k.id === `person:${partner.id}`) || null;
                    const shown = Talk.layout().player.keywords.filter(k => k.visible).map(k => k.label);
                    const facId = `faction:${fid}`;
                    const ok = !before.includes(facId) && afterName.includes(facId) && afterName.includes("family") && !before.includes(`person:${partner.id}`) && !!pKw && pKw.isNew
                        && famText.includes(partner.name) && shown.includes(partner.name) && nameText.toLowerCase().includes(shortName(faction.name).toLowerCase());
                    check("keywords_grow", ok, `before [${before.join(", ")}]; "name": "${nameText}" → [${afterName.join(", ")}]; "family": "${famText}" → partner ${partner.name} (#${partner.id}, ${partnerFrom}) `
                        + `${pKw ? `added (new ${pKw.isNew})` : "NOT added"}; drawn keywords [${shown.join(", ")}]`);
                }

                // talk.companion_chimes_in: a colonist of ours placed next to A; the seeded roll says after which question one speaks.
                {
                    const range = chimeRange();
                    let comp = null;
                    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1]]) {
                        // The other gender, so the stock placeholder face (often one per species and gender) differs from A's.
                        comp = spawn("TEST_companion", dx, dy, { kind: "colonist", faction: A.data.faction, species: A.data.species, gender: A.data.gender === "female" ? "male" : "female", age: 29, ai: null }, A.image.characterName, 1);
                        if (comp && cheb(comp, A) <= range) break;
                        unspawn(comp);
                        comp = null;
                    }
                    if (comp) await t.waitUntil(() => !!W.eventOf(comp.id), 3000, "the companion's event");
                    const repId = Talk.current().playerId;
                    const near = companionsNear(A, repId);
                    const allNear = near.every(v => cheb(v, A) <= range && isOwn(v) && v.id !== A.id && v.id !== repId);
                    const farOnes = W.units().filter(v => isOwn(v) && isTalkable(v) && v.id !== A.id && v.id !== repId && sameArea(v.area, A.area) && cheb(v, A) > range);
                    let seen = null, asks = 0;
                    const mismatches = [];
                    for (let i = 0; i < 30 && !seen; i++) {
                        const kws = Talk.current().keywords.filter(k => k.id !== "bye");
                        const k = kws[i % kws.length];
                        const n = Talk.current().asked[k.id] || 0;
                        const want = chimeFor(A, k.id, n, lineFor(A, k.id, n, k.label).adds, repId);
                        Talk.ask(k.id);
                        asks++;
                        readAll();
                        const got = Talk.current().chime;
                        if (!!want !== !!got || (want && got && (want.unitId !== got.unitId || want.text !== got.text))) mismatches.push(`${k.id}#${n}: predicted ${want ? want.unitId : "none"}, got ${got ? got.unitId : "none"}`);
                        if (got && got.shown) seen = { got, k: k.id };
                    }
                    await t.waitFrames(3);
                    const lay = Talk.layout();
                    let compInk = 0, compWords = "";
                    if (seen && lay) {
                        compInk = ink(Talk.screen().comp.face.bitmap, 20, 20, FACE - 40, FACE - 40, 250);
                        compWords = lay.comp.drawn ? lay.comp.drawn.lines.join(" ") : "";
                        t.screenshot("companion");
                    }
                    const speaker = seen ? unitById(seen.got.unitId) : null;
                    const chimeTpls = [];
                    for (const cs of [aboutThem(), remarks()]) for (const k of Object.keys(cs)) if (Array.isArray(cs[k])) chimeTpls.push(...cs[k]);
                    const ok = !!comp && !!seen && near.some(v => v.id === comp.id) && allNear && !farOnes.some(v => near.includes(v)) && !mismatches.length && !!speaker && near.includes(speaker)
                        && lay.comp.face.visible && compInk > 400 && lay.comp.face.y >= lay.other.face.y + FACE && lay.comp.face.y + FACE < lay.player.face.y
                        && compWords === seen.got.text && fromTemplates(seen.got.text, chimeTpls);
                    check("companion_chimes_in", ok, `companion placed: ${comp ? `${comp.name} ${cheb(comp, A)} cells from ${A.name}` : "NONE within range"}; within ${range} cells: [${near.map(v => v.name).join(", ")}] (all within range ${allNear}; ${farOnes.length} of ours farther, none listed ${!farOnes.some(v => near.includes(v))}); `
                        + `${seen ? `after ${asks} question(s) ${speaker ? speaker.name : "?"} chimed in on "${seen.k}": "${seen.got.text}" (drawn "${compWords}", portrait ${compInk} opaque px at y ${lay.comp.face.y})` : `no chime in ${asks} questions`}; `
                        + `prediction mismatches: ${mismatches.length ? mismatches.join("; ") : "none"}`);
                    Talk.closeNow();
                    unspawn(comp);
                }

                // talk.hostile_refuses_over_head: a stranger of a faction at war refuses; the refusal floats over their head; no talk opens.
                {
                    run();
                    await t.waitFrames(2);
                    if (!fx.relations.some(r => r[0] === fHostile.id)) fx.relations.push([fHostile.id, F.relation("player", fHostile.id)]);
                    F.setRelation("player", fHostile.id, -80);
                    centerOn(grump);
                    await t.waitFrames(3);
                    const cg = cellOf(grump);
                    const hasOption = I.optionsFor(cg.x, cg.y).some(o => o.id === "talk");
                    const res = Talk.open(grump.id);
                    const ref = Talk.lastRefusal();
                    const oh = Talk.lastOverHead();
                    const openNow = Talk.isOpen();
                    const runningNow = !!Tm && !Tm.paused;
                    let spriteOk = false, spriteNote = "";
                    if (oh && oh.via === "fallback") {
                        await t.waitFrames(2);
                        const sp = oh.sprite, ev = W.eventOf(grump.id);
                        const tilemap = SceneManager._scene._spriteset._tilemap;
                        const spInk = ink(sp.bitmap, 0, 0, sp.bitmap.width, sp.bitmap.height, 200);
                        spriteOk = sp.parent === tilemap && sp.visible && sp.z === OH_Z && !!ev && Math.abs(sp.x - ev.screenX()) <= 1 && sp.y < ev.screenY() - 20 && spInk > 100;
                        spriteNote = `fallback line in the tilemap ${sp.parent === tilemap}, visible ${sp.visible}, z ${sp.z}, at (${Math.round(sp.x)},${Math.round(sp.y)}) over the unit at (${ev ? ev.screenX() : "?"},${ev ? ev.screenY() : "?"}), ${spInk} inked px`;
                        t.screenshot("refuse");
                    } else if (oh && oh.via === "UF.Speech") {
                        await t.waitFrames(8);
                        const S = UF.Speech;
                        const said = S.lines ? S.lines(grump.id).map(l => l.text).join(" ") : "";
                        const norm = s => String(s || "").replace(/\s+/g, " ").trim();
                        spriteOk = oh.unitId === grump.id && !!S.isSpeaking && S.isSpeaking(grump.id) && norm(said) === norm(ref && ref.text);
                        spriteNote = `said through UF.Speech.say (ids ${JSON.stringify(oh.ids)}); UF.Speech.lines(${grump.name}): "${said}"`;
                        t.screenshot("refuse");
                    }
                    const refuseOk = !!ref && ref.unitId === grump.id && ref.mode === "hostile" && fromTemplates(ref.text, L("refuse"));
                    check("hostile_refuses_over_head", hasOption && res === null && !openNow && runningNow && refuseOk && !!oh && oh.unitId === grump.id && oh.text === (ref && ref.text) && spriteOk,
                        `${grump.name} of ${fHostile.name} at war (-80): Talk offered ${hasOption}; open returned ${res === null ? "null" : "a talk"}, talk open ${openNow}, world running ${runningNow}; `
                        + `refusal ${ref ? `"${ref.text}" (mode ${ref.mode}, a refuse template ${refuseOk})` : "none"}; ${spriteNote || "no over-head line"}`);
                    if (Talk.isOpen()) Talk.closeNow();
                    F.setRelation("player", fHostile.id, fx.relations.find(r => r[0] === fHostile.id)[1]);
                    pause();
                }

                // talk.lines_well_formed + talk.no_banned_words: every template string, and at least 200 generated lines (chimes too).
                {
                    const strings = [];
                    const walk = v => {
                        if (typeof v === "string") strings.push(v);
                        else if (Array.isArray(v)) v.forEach(walk);
                        else if (v && typeof v === "object") Object.values(v).forEach(walk);
                    };
                    walk(T());
                    const badT = strings.filter(s => BANNED.test(s));
                    const speakers = [];
                    for (const u of [A, partner, leader, stranger, grump].concat(W.unitsInArea(area.x, area.y).filter(isTalkable))) if (u && !speakers.includes(u)) speakers.push(u);
                    const topics = ["greet", "name", "job", "family", "home", "mood", "others", "news", "bye", "need:hunger", "need:thirst", "need:sleep", "need:social", "need:nature"];
                    const lines = [];
                    for (let n = 0; n < 4; n++) {
                        for (const u of speakers) {
                            const extra = [];
                            const addsOf = {};
                            for (const key of topics) {
                                const r = lineFor(u, key, n);
                                lines.push(r.text);
                                addsOf[key] = r.adds;
                                for (const a of r.adds) if (!extra.includes(a.id)) extra.push(a.id);
                            }
                            for (const key of extra) {
                                const r = lineFor(u, key, n);
                                lines.push(r.text);
                                addsOf[key] = r.adds;
                            }
                            // Companions: a remark on every topic, and what the ones it concerns say (named, kin, factions).
                            const comps = speakers.filter(v => v !== u && isOwn(v) && stageOf(v) !== "baby").slice(0, 3);
                            for (const key of topics.concat(extra)) {
                                if (key === "bye") continue;
                                const rm = chimeRemark(comps[0] || A, u, key, n);
                                if (rm) lines.push(rm.text);
                                for (const c of comps) {
                                    const ab = chimeAbout(c, u, key, n, addsOf[key]);
                                    if (ab) lines.push(ab.text);
                                }
                            }
                        }
                    }
                    const badG = lines.filter(s => BANNED.test(s));
                    const malformed = lines.filter(s => !s || /\{\w+\}|[[\]]/.test(s) || s.split(/(?<=[.?!])\s+/).some(p => /^["(]?[a-z]/.test(p)));
                    check("lines_well_formed", lines.length >= 200 && !malformed.length, `${lines.length} generated lines, ${malformed.length} empty, with an unfilled {slot} or [topic], or with a sentence starting in lower case${malformed.length ? `; first: "${malformed[0]}"` : ""}`);
                    check("no_banned_words", strings.length >= 50 && lines.length >= 200 && !badT.length && !badG.length,
                        `${strings.length} template strings (catalog "talk" ${catalog() && catalog().talk ? "present" : "MISSING, fallback used"}, "lines" ${T().lines ? "present" : "missing"}), ${badT.length} with a banned word${badT.length ? `: "${badT[0]}"` : ""}; `
                        + `${lines.length} generated lines from ${speakers.length} speakers (chimes included), ${badG.length} with a banned word${badG.length ? `: "${badG[0]}"` : ""}; sample: "${lines[9] || ""}" / "${lines[lines.length - 1] || ""}"`);
                }

                // talk.perf: per-frame cost with a talk open and the pointer moving over the keywords (budget 0.2 ms), no Bitmap made per frame.
                {
                    Talk.open(stranger.id);
                    await waitFaces("the stranger's portrait");
                    await t.waitFrames(INPUT_DELAY + 2);
                    Talk.resetStats();
                    const made0 = bitmapsMade;
                    const rects = Talk.layout().player.keywords.filter(k => k.visible);
                    const px = TouchInput._x, py = TouchInput._y;
                    for (let i = 0; i < 90; i++) {
                        const r = rects[i % rects.length];
                        TouchInput._x = Math.round(r.x + r.w / 2);
                        TouchInput._y = Math.round(r.y + r.h / 2);
                        await t.waitFrames(1);
                    }
                    TouchInput._x = px;
                    TouchInput._y = py;
                    const st = Talk.stats();
                    const perFrame = st.frames ? st.ms / st.frames : Infinity;
                    const made = bitmapsMade - made0;
                    const keys = ["name", "job", "family", "home", "mood", "others", "news", `faction:${fid}`, `person:${partner.id}`, `person:${leader.id}`];
                    const t0 = performance.now();
                    let n = 0;
                    for (let k = 0; k < 5; k++) for (const u of [A, stranger]) for (const key of keys) { lineFor(u, key, k); n++; }
                    const perLine = (performance.now() - t0) / n;
                    Talk.closeNow();
                    check("perf", perFrame <= 0.2 && made === 0 && perLine <= 2, `tick ${perFrame.toFixed(4)} ms per frame over ${st.frames} frames with a talk open and the pointer moving over ${rects.length} keywords; `
                        + `${made} Bitmap(s) made in those frames; ${perLine.toFixed(3)} ms per line over ${n} lines (${W.units().length} units in the world)`);
                }
            } catch (e) {
                for (const n of NAMES) if (!done.has(n)) check(n, false, `not reached: the suite stopped with ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
            } finally {
                try { if (Talk.isOpen()) Talk.closeNow(); } catch (e) { /* cleanup */ }
                for (const u of fx.units) if (W.unit(u.id)) W.removeUnit(u.id);
                for (const [id, v] of fx.relations) F.setRelation("player", id, v);
                if (fx.met) for (const [id, met] of fx.met) { const f = F.get(id); if (f) f.met = met; }
                if (fx.partner) { if (fx.partner.had) fx.partner.unit.data.partner = fx.partner.old; else delete fx.partner.unit.data.partner; }
                if (fx.rank) { if (fx.rank.had) fx.rank.unit.data.rank = fx.rank.old; else delete fx.rank.unit.data.rank; }
                if (fx.thoughts) { if (fx.thoughts.had) fx.thoughts.unit.data.thoughts = fx.thoughts.old; else delete fx.thoughts.unit.data.thoughts; }
                if (window.$colonyManager && fx.sel !== undefined) { if (fx.sel !== null) $colonyManager.select(fx.sel); else $colonyManager.deselect(); }
                if (fx.pausedByTest && Tm && Tm.paused) Tm.resume();
            }
            await t.waitFrames(10);
            const errs = t.errorsSoFar().slice(errors0);
            t.check("no_errors", errs.length === 0, errs.length ? `${errs.length} error(s), first: ${errs[0]}` : "no uncaught error during the suite");
        }, { isDefault: false });
    }
})();
