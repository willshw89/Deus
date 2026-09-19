//=============================================================================
// UF_Talk.js - Talk with anyone: keyword conversations built from the simulation
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Talk] Right-click a person and choose Talk: their portrait and words a page at a time, your portrait beside the keywords, nearby companions chiming in. The world pauses while it is open.
 * @author UF project
 * @base UF_World
 * @base UF_Interact
 * @orderAfter UF_Interact
 *
 * @help
 * Conversations with anyone (VISION V25 and V62, user 2026-09-19), laid out
 * as the classic portrait-and-keywords conversation: right-click a person
 * (one of your colonists or a stranger; never an animal) and choose
 * "Talk to <name>". Three windows at the bottom of the screen:
 *   their window    the person's portrait, name and what they say, shown a
 *                   page at a time: a page with more after it ends in a
 *                   "more" mark; click, Enter, Z or Space turns the page,
 *                   right-click or Esc shows the last page.
 *   your window     the portrait of whoever speaks for you (the colonist
 *                   you have selected, else your faction's ruler, else
 *                   your nearest grown person; an emblem in your colours
 *                   when nobody can) with the keywords beside it. The
 *                   keywords wait (dimmed) until the last page is shown.
 *   a companion     one of your people standing near the person (catalog
 *                   talk.chime.range cells) may chime in with their own
 *                   portrait and line, when the line names them, is about
 *                   their family, or about a faction they love or hate
 *                   (greetings and news: a seeded chance). Their window
 *                   opens above the other two.
 * The keywords:
 *   always     name, job, bye
 *   then       family, home, mood, others, news (when the world has
 *              something to say about them)
 *   and        every person, faction or place a line names becomes a
 *              new keyword (shown highlighted), so a talk leads on.
 * Nothing is scripted: every line is a template from the catalog
 * (data/UF_WorldCatalog.json "talk") filled with names and facts read
 * from the simulation (their faction and its leader, their partner and
 * children, their current job, needs, mood and latest thought, the
 * factions they know and how they feel about them, the newest chronicle
 * event near them). Strangers greet by their faction's relation to yours:
 * friendly, wary, or (hostile) they refuse to talk.
 *
 * The world pauses while the window is open (UF.Time.pause) and runs again
 * when it closes, unless it was already paused before.
 * Mouse: click a keyword; right-click or Esc = bye (while a line still has
 * pages: click turns the page, right-click shows the last one). Keys:
 * arrows / WASD move between keywords, Enter / Z / Space choose.
 *
 * API, state, events and checks: docs/systems/UF_Talk.md
 * Replaced core methods: none (aliases only). Wraps UF.Interact.optionsFor
 * and UF.Interact.handleMouse at runtime and aliases the context menu
 * window's initialize / setOptions, so the Talk option shows in the menu.
 */

(() => {
    "use strict";

    const PLUGIN = "UF_Talk";
    const params = PluginManager.parameters(PLUGIN) || {};

    //-------------------------------------------------------------------------
    // Constants (layout and cadence; all wording lives in the catalog "talk" section)

    const PORTRAIT = 144;          // the face frame (RPG Maker face cells are 144x144): the person, and whoever speaks for you
    const COMP_PORTRAIT = 96;      // a companion who chimes in
    const MARGIN = 12;             // distance of the windows from the screen edges
    const GAP = 4;                 // between the windows
    const MAIN_H = 192;            // the person's window: portrait, name, subtitle, 4 lines a page and the "more" mark
    const COMP_H = 132;            // the companion's window: small portrait, name, 2 lines a page and the "more" mark
    const KW_ROWS = 4;             // keyword rows beside your portrait before the list scrolls
    const KW_COLS = 4;
    const KW_LINE = 26;
    const KW_X = PORTRAIT + 12;    // the keywords start right of your portrait
    const TEXT_FONT = 19;          // speech
    const LINE_H = 25;
    const MORE_H = 16;             // the row under a page that has more after it
    const INPUT_LOCK = 2;          // frames after a line appears before a click or key can turn its page
    const CHIME_RANGE = 5;         // cells (Chebyshev) from the person; catalog talk.chime.range
    const CHIME_CHANCE = 35;       // percent, greetings and news only; catalog talk.chime.chance
    const BYE_FRAMES = 45;         // the farewell stays on screen this long (after its last page), then the windows close
    const SOCIAL_RELIEF = 10;      // how much a talk eases your colonist's social need (when UF_Colonists offers an API for it)
    const SALT_TALK = 0x7a1c;      // template choice
    const SALT_FACE = 0xfa5e;      // portrait choice
    const SALT_CHIME = 0xc41e;     // whether a companion chimes in on a greeting or news
    const FACE_CACHE = 24;         // code-drawn portraits kept
    const STANCE_COLORS = { own: "#86efac", friendly: "#93c5fd", wary: "#fde68a", hostile: "#fca5a5", baby: "#e5e7eb" };
    const NEW_COLOR = "#ffe28a";
    const BANNED = /\b(avatar|britannia|guardian|lord british|iolo|dupre|shamino|fellowship|moongate|black ?gate|serpent isle|urist|armok|strange mood|fey mood|dwarf fortress|ultima|beholder|mind flayer|illithid|displacer beast|githyanki)\b/i;

    // Used only when the catalog has no "talk" section (a stripped catalog must not break the menu).
    const FALLBACK = {
        kinds: ["colonist", "person"],
        optionLabel: "Talk to {name}",
        keywords: { name: "name", job: "job", bye: "bye", family: "family", home: "home", mood: "mood", others: "others", news: "news" },
        greet: { own_fine: ["Yes?"], friendly: ["Greetings."], wary: ["What do you want?"] },
        refuse: ["{name} turns away."],
        baby: ["The baby babbles."],
        name: { default: ["I am {name}."] },
        job: { busy: ["Right now I'm {job}."], idle: ["Nothing just now."] },
        bye: { own: ["Take care."], friendly: ["Farewell."], wary: ["Go."], hostile: ["Go."], baby: ["The baby waves."] },
        unknown: ["I don't know anything about that."]
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

    /** The catalog's "talk" section (or the minimal fallback). */
    const T = () => {
        const c = catalog();
        return (c && c.talk) || FALLBACK;
    };
    const word = (key, fallback) => {
        const w = T().words;
        return w && typeof w[key] === "string" ? w[key] : fallback;
    };

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
        if (st === "hostile" && provoked("hostile_refuses")) st = "wary";
        return st;
    }
    /** How the talk goes: "baby" (babbles), "hostile" (refuses), else the stance. */
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
        if (provoked("topics_from_state")) return null;
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
        if (provoked("topics_from_state")) return null;
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
    // Keywords and slots

    const personKw = p => ({ id: `person:${p.id}`, label: p.name, topic: "person", ref: p.id });
    const factionKw = f => ({ id: `faction:${f.id}`, label: shortName(f.name), topic: "faction", ref: f.id });
    const siteKw = s => ({ id: `site:${s.id}`, label: s.name, topic: "site", ref: s.id });
    const personSlot = p => (p ? { text: p.name, kw: personKw(p) } : null);
    const factionSlot = f => (f ? { text: inSentence(f.name), kw: factionKw(f) } : null);
    const siteSlot = s => (s && s.name ? { text: s.name, kw: siteKw(s) } : null);

    const SLOT_RE = /\{(\w+)\}/g;
    const slotsIn = tpl => Array.from(String(tpl).matchAll(SLOT_RE), m => m[1]);
    const has = (slots, k) => slots[k] !== undefined && slots[k] !== null && !(Array.isArray(slots[k]) && !slots[k].length);
    function listJoin(texts) {
        if (texts.length <= 1) return texts.join("");
        return `${texts.slice(0, -1).join(", ")} ${word("and", "and")} ${texts[texts.length - 1]}`;
    }
    /** Fill a template; every slot that names someone or something pushes its keyword into `adds`. */
    function fill(tpl, slots, adds) {
        const src = String(tpl);
        return src.replace(SLOT_RE, (m, key, offset) => {
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
            // A name that opens a sentence ("Greetings. The ... are welcome") starts with a capital.
            const before = src.slice(0, offset).trimEnd();
            return (!before || /[.?!"]$/.test(before)) && !provoked("lines_well_formed") ? capFirst(text) : text;
        });
    }
    /**
     * One sentence from a template list: section[variant] for the first variant with a usable template (all its slots
     * known), chosen by hash32(seed, unit, topic, n) so the same question gets the same answer until it is asked again.
     */
    function say(section, variants, slots, unit, key, n, adds) {
        const sec = T()[section] !== undefined ? T()[section] : FALLBACK[section];
        const usable = list => (Array.isArray(list) ? list.filter(t => typeof t === "string" && slotsIn(t).every(k => has(slots, k))) : []);
        let list = [];
        if (Array.isArray(sec)) list = usable(sec);
        else if (sec) {
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
    function nameLine(u, n, adds) {
        const d = u.data || {};
        const f = factionOf(u);
        const stage = stageOf(u);
        const variants = [];
        if ((d.rank | 0) >= 2) variants.push("ruler");
        else if ((d.rank | 0) === 1) variants.push("leader");
        if (stage === "child" || stage === "teen") variants.push("child");
        variants.push(f ? "default" : "nofaction", "nofaction");
        const name = provoked("name_and_job") ? "someone" : u.name;
        return say("name", variants, { name, faction: factionSlot(f) }, u, "name", n, adds);
    }
    function jobLine(u, n, adds) {
        const d = u.data || {};
        const doing = provoked("name_and_job") ? { text: "working", other: null } : doingOf(u);
        const parts = [];
        if (doing) parts.push(say("job", ["busy"], { job: { text: doing.text, kw: doing.other ? personKw(doing.other) : null }, name: u.name }, u, "job", n, adds));
        else parts.push(say("job", ["idle"], { name: u.name }, u, "job", n, adds));
        const rank = d.rank | 0;
        if (rank >= 2) parts.push(say("job", ["ruler"], { faction: factionSlot(factionOf(u)) }, u, "job.role", n, adds));
        else if (rank === 1) parts.push(say("job", ["leader"], {}, u, "job.role", n, adds));
        const sup = provoked("topics_from_state") ? null : superiorOf(u);
        if (sup && rank < 2) parts.push(say("job", ["superior"], { superior: personSlot(sup) }, u, "job.superior", n, adds));
        return join(parts);
    }
    function familyLine(u, n, adds) {
        const parts = [];
        const partner = partnerOf(u);
        const kids = provoked("topics_from_state") ? [] : childrenOf(u);
        const stage = stageOf(u);
        if (partner) parts.push(say("family", ["partner"], { partner: personSlot(partner) }, u, "family.partner", n, adds));
        else if (stage === "adult" || stage === "elder") parts.push(say("family", ["noPartner"], {}, u, "family.partner", n, adds));
        if (kids.length) {
            const slots = { children: kids.map(personSlot), count: kids.length };
            parts.push(say("family", kids.length === 1 ? ["child", "children"] : ["children"], slots, u, "family.children", n, adds));
        } else if (stage === "adult" || stage === "elder") parts.push(say("family", ["noChildren"], {}, u, "family.children", n, adds));
        const mother = provoked("topics_from_state") ? null : motherOf(u), father = provoked("topics_from_state") ? null : fatherOf(u);
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
        const needs = d.needs || null;
        if (needs) {
            const at = typeof T().needAt === "number" ? T().needAt : 60;
            let top = null;
            for (const k of Object.keys(needs)) if (typeof needs[k] === "number" && needs[k] >= at && (!top || needs[k] > needs[top])) top = k;
            if (top) parts.push(say("needs", [top], {}, u, `needs.${top}`, n, adds));
        }
        const thought = Array.isArray(d.thoughts) && d.thoughts[0] && d.thoughts[0].text ? d.thoughts[0].text : null;
        if (thought) parts.push(say("mood", ["thought"], { thought }, u, "mood.thought", n, adds));
        return join(parts) || say("mood", ["unknown"], {}, u, "mood", n, adds);
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
        const ruler = provoked("topics_from_state") ? null : rulerOf(u.data.faction);
        if (ruler && ruler.id === p.id) rels.push("leader");
        const sup = provoked("topics_from_state") ? null : superiorOf(u);
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

    /** The line for a keyword id ("name", "job", "family", "faction:f2", "person:17", "site:4", "greet", "bye", ...). */
    function lineFor(unitOrId, key, n = 0, label = "") {
        const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
        const adds = [];
        if (!u) return { text: "", adds, key };
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
        return { text, adds, key: String(key) };
    }

    /** The keywords a talk starts with: name, job, then the topics the world has something on, bye last. */
    function initialKeywords(u, mode) {
        const K = Object.assign({}, FALLBACK.keywords, T().keywords || {});
        const kw = id => ({ id, label: K[id] || id, topic: id, ref: null, asked: false, isNew: false });
        if (mode === "hostile" || mode === "baby") return [kw("bye")];
        const list = [kw("name"), kw("job"), kw("family")];
        if (homeOf(u)) list.push(kw("home"));
        const d = u.data || {};
        if (d.mood || d.needs || (Array.isArray(d.thoughts) && d.thoughts.length)) list.push(kw("mood"));
        if (knownFactions(u).length) list.push(kw("others"));
        if (newsFor(u)) list.push(kw("news"));
        list.push(kw("bye"));
        return list;
    }

    //-------------------------------------------------------------------------
    // Who speaks for you, and the companions who may chime in (V62)

    /** Where a unit stands now: its event's cell on the map on screen, else its world cell. */
    function cellNow(v) {
        const W = World();
        const ev = W && W.eventOf ? W.eventOf(v.id) : null;
        return ev ? { x: ev.x, y: ev.y } : { x: v.x, y: v.y };
    }
    const cellDist = (a, b) => {
        const p = cellNow(a), q = cellNow(b);
        return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
    };
    /** One of yours who can speak: talkable, not a baby, not the person spoken to. */
    const canSpeakFor = (v, u) => !!v && !!v.data && (!u || v.id !== u.id) && isOwn(v) && isTalkable(v) && stageOf(v) !== "baby";
    /**
     * Whoever speaks for you in a talk with `u` (there is no protagonist, V4): the colonist you have selected, else your
     * faction's ruler, else your nearest grown person in the area. `{ unit, from }`, or null (nobody: an emblem is drawn).
     */
    function voiceOf(u) {
        if (provoked("player_portrait")) return null;
        const cm = window.$colonyManager;
        const s = cm && cm.selectedColonist ? cm.selectedColonist : null;
        const sel = s ? (s.unit && s.unit.data ? s.unit : unitById(s.id)) : null;
        if (canSpeakFor(sel, u)) return { unit: sel, from: "selected" };
        const r = rulerOf(playerFactionId() || "player");
        if (canSpeakFor(r, u)) return { unit: r, from: "ruler" };
        const W = World();
        if (!W || !u) return null;
        let best = null, bd = Infinity;
        for (const v of W.units()) {
            if (!canSpeakFor(v, u) || !sameArea(v.area, u.area) || !["adult", "elder"].includes(stageOf(v))) continue;
            const d = cellDist(v, u);
            if (d < bd || (d === bd && v.id < best.id)) { best = v; bd = d; }
        }
        return best ? { unit: best, from: "nearest" } : null;
    }
    const numOr = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
    const chimeConf = () => {
        const c = T().chime || {};
        return { range: numOr(c.range, CHIME_RANGE), chance: numOr(c.chance, CHIME_CHANCE) };
    };
    /** Your people standing within talk.chime.range cells of `u` (not `u`, not your voice, not babies), nearest first. */
    function companionsOf(u, voiceId) {
        const W = World();
        if (!W || !u) return [];
        const { range } = chimeConf();
        const out = [];
        for (const v of W.units()) {
            if (v.id === u.id || v.id === voiceId || !canSpeakFor(v, u) || !sameArea(v.area, u.area)) continue;
            const d = cellDist(v, u);
            if (d <= range) out.push({ v, d });
        }
        out.sort((a, b) => a.d - b.d || a.v.id - b.v.id);
        return out.map(e => e.v);
    }
    /**
     * A companion's line after `u` answered `key` (the n-th time), or null. The first companion (nearest first) with
     * something to say speaks: the line names them ("named"), the topic is them ("self") or their partner, child,
     * mother or father, or a faction yours is allied or friendly with ("factionGood") or hostile or at war with
     * ("factionBad"); on a stranger's greeting ("greetFriendly", "greetWary") and on news ("news") only by a seeded
     * chance (talk.chime.chance percent). Never on bye, never in a hostile or baby talk.
     */
    function chimeFor(unitOrId, key, n, lineAdds, voiceId) {
        const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
        if (!u || provoked("companion_chimes")) return null;
        const sec = T().chime;
        if (!sec || typeof sec !== "object") return null;
        const mode = modeOf(u);
        if (mode === "hostile" || mode === "baby") return null;
        const [topic, ref] = String(key).split(":");
        if (topic === "bye") return null;
        const refId = ref !== undefined && /^\d+$/.test(ref) ? Number(ref) : ref;
        const { chance } = chimeConf();
        const named = new Set((lineAdds || []).filter(a => a && a.topic === "person").map(a => a.ref));
        const F = Factions();
        for (const c of companionsOf(u, voiceId)) {
            const variants = [];
            const slots = { name: c.name, speaker: personSlot(u) };
            let byChance = false;
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
            if (!variants.length) {
                if (topic === "greet" && !isOwn(u)) variants.push(mode === "friendly" ? "greetFriendly" : "greetWary");
                else if (topic === "news") variants.push("news");
                byChance = variants.length > 0;
            }
            if (!variants.length) continue;
            if (byChance && hash32(seed(), c.id, SALT_CHIME, strHash(String(key)), u.id, n | 0) % 100 >= chance) continue;
            const adds = [];
            const text = say("chime", variants, slots, c, `chime.${key}`, n, adds);
            if (text) return { unitId: c.id, name: c.name, variants, text, adds, portrait: portraitOf(c) };
        }
        return null;
    }

    //-------------------------------------------------------------------------
    // Portraits: data.face, then catalog.faces (the character sheet's key, V49), then talk.portraits (stock
    // placeholders), else a code-drawn bust (UF_GenFace).

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
            } else if (e && e.sheet) {
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
    function portraitOf(u) {
        const d = (u && u.data) || {};
        if (d.face && d.face.sheet) return { kind: "face", sheet: d.face.sheet, index: d.face.index | 0, from: "data.face" };
        const cat = catalog() || {};
        const g = d.gender === "female" ? "female" : "male";
        const stage = stageOf(u);
        const pick = (list, from) => {
            if (!list.length) return null;
            const f = list[hash32(seed(), u.id, SALT_FACE) % list.length];
            return { kind: "face", sheet: f.sheet, index: f.index, from };
        };
        const bySpecies = (root, from) => (root && d.species && root[d.species] ? pick(stagedFaces(root[d.species][g], stage), from) : null);
        return bySpecies(cat.faces, "catalog.faces") || bySpecies(T().portraits, "catalog.talk.portraits")
            || { kind: "gen", name: `UF_GenFace_${u.id}`, from: "code" };
    }

    const faceCache = new Map();
    const hexRgb = hex => {
        const n = parseInt(String(hex || "#ffffff").replace("#", ""), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const rgbHex = ([r, g, b]) => `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
    const mulColor = (a, b) => rgbHex(hexRgb(a).map((v, i) => (v * hexRgb(b)[i]) / 255));
    const shade = (hex, f) => rgbHex(hexRgb(hex).map(v => v * f));
    /** A code-drawn head-and-shoulders portrait: species tint on the skin, faction colour on the clothes, hair by gender and age. */
    function genFace(u) {
        const d = u.data || {};
        const stage = stageOf(u);
        const key = `${u.id}:${stage}:${d.gender}:${d.species}`;
        if (faceCache.has(key)) return faceCache.get(key);
        const S = PORTRAIT;
        const b = new Bitmap(S, S);
        const c = b.context;
        const people = (catalog() && catalog().people) || {};
        const tint = people[d.species] && people[d.species].tint ? people[d.species].tint : "#ffffff";
        const skin = mulColor("#c99f7b", tint);
        const f = factionOf(u);
        const cloth = shade(f && f.color ? f.color : "#8a7050", 0.55);
        const hairs = ["#2b1d14", "#4a3020", "#6e4b2a", "#1c1b1a", "#8a6a3c", "#7a3a22"];
        const hair = stage === "elder" ? "#bdb8ae" : hairs[hash32(seed(), u.id, SALT_FACE, 1) % hairs.length];
        const long = d.gender === "female";
        const scale = stage === "baby" ? 0.62 : stage === "child" ? 0.78 : stage === "teen" ? 0.9 : 1;
        const grad = c.createLinearGradient(0, 0, 0, S);
        grad.addColorStop(0, "#3b352d");
        grad.addColorStop(1, "#16130f");
        c.fillStyle = grad;
        c.fillRect(0, 0, S, S);
        c.save();
        c.translate(S / 2, S);
        c.scale(scale, scale);
        c.translate(-S / 2, -S);
        const ell = (x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
        if (long) ell(72, 84, 33, 46, shade(hair, 0.8));                  // hair behind the head
        ell(72, 152, 60, 44, cloth);                                       // shoulders
        ell(72, 150, 44, 30, shade(cloth, 1.25));                          // chest light
        c.fillStyle = shade(skin, 0.78);
        c.fillRect(62, 88, 20, 26);                                        // neck
        ell(72, 68, 25, 31, skin);                                         // head
        ell(80, 72, 14, 22, shade(skin, 1.08));                            // light from the upper left falls on the right cheek
        c.fillStyle = hair;                                                // hair on top
        c.beginPath();
        c.ellipse(72, 54, 27, 21, 0, Math.PI, 0);
        c.fill();
        c.fillRect(45, 50, 6, long ? 40 : 16);
        c.fillRect(93, 50, 6, long ? 40 : 16);
        ell(63, 71, 2.6, 2, "#1a1410");                                   // eyes
        ell(81, 71, 2.6, 2, "#1a1410");
        c.fillStyle = shade(skin, 0.6);
        c.fillRect(66, 86, 12, 2);                                         // mouth
        c.restore();
        if (b._baseTexture && b._baseTexture.update) b._baseTexture.update();
        b._ufName = `UF_GenFace_${u.id}`;
        faceCache.set(key, b);
        while (faceCache.size > FACE_CACHE) {
            const first = faceCache.keys().next().value;
            const old = faceCache.get(first);
            faceCache.delete(first);
            if (old && old.destroy) old.destroy();
        }
        return b;
    }

    const emblemCache = new Map();
    /** A code-drawn shield in your faction's colour: your portrait when nobody of yours can speak (UF_GenEmblem). */
    function genEmblem(color) {
        const key = /^#[0-9a-f]{6}$/i.test(String(color || "")) ? String(color) : "#8a7050";
        if (emblemCache.has(key)) return emblemCache.get(key);
        const S = PORTRAIT;
        const b = new Bitmap(S, S);
        const c = b.context;
        const grad = c.createLinearGradient(0, 0, 0, S);
        grad.addColorStop(0, "#3b352d");
        grad.addColorStop(1, "#16130f");
        c.fillStyle = grad;
        c.fillRect(0, 0, S, S);
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
        if (b._baseTexture && b._baseTexture.update) b._baseTexture.update();
        b._ufName = "UF_GenEmblem";
        emblemCache.set(key, b);
        return b;
    }

    /**
     * Draw a portrait with a thin frame into bitmap `c` at (x, y), S px square. `holder` is { portrait, unitId }:
     * a face sheet cell (loaded on demand; `onReady` runs when it arrives; a sheet that fails switches the holder to
     * the code-drawn bust), an emblem, or the unit's code-drawn bust. `provokeName`: the test sabotage that skips it.
     */
    function drawPortraitInto(c, holder, x, y, S, onReady, provokeName) {
        const border = "rgba(214,190,140,0.85)";
        c.fillRect(x, y, S, 2, border);
        c.fillRect(x, y + S - 2, S, 2, border);
        c.fillRect(x, y, 2, S, border);
        c.fillRect(x + S - 2, y, 2, S, border);
        if (provokeName && provoked(provokeName)) return { drawn: false, pending: false };
        const p = holder ? holder.portrait : null;
        if (p && p.kind === "face") {
            const bmp = ImageManager.loadFace(p.sheet);
            if (bmp.isError && bmp.isError()) {
                holder.portrait = { kind: "gen", name: `UF_GenFace_${holder.unitId}`, from: `code (${p.sheet} failed to load)` };
                return drawPortraitInto(c, holder, x, y, S, onReady, provokeName);
            }
            if (!bmp.isReady()) {
                bmp.addLoadListener(onReady);
                return { drawn: false, pending: true };
            }
            const pw = ImageManager.faceWidth, ph = ImageManager.faceHeight;
            c.blt(bmp, (p.index % 4) * pw, Math.floor(p.index / 4) * ph, pw, ph, x + 2, y + 2, S - 4, S - 4);
            return { drawn: true, pending: false };
        }
        if (p && p.kind === "emblem") {
            c.blt(genEmblem(p.color), 0, 0, PORTRAIT, PORTRAIT, x + 2, y + 2, S - 4, S - 4);
            return { drawn: true, pending: false };
        }
        const u = holder ? unitById(holder.unitId) : null;
        if (!u) return { drawn: false, pending: false };
        c.blt(genFace(u), 0, 0, PORTRAIT, PORTRAIT, x + 2, y + 2, S - 4, S - 4);
        return { drawn: true, pending: false };
    }

    //-------------------------------------------------------------------------
    // Windows

    /**
     * A speaker's window: portrait on the left, name (and for the person spoken to a stance label and a subtitle),
     * then the current page of their words. The person's window has a 144 px portrait; a companion's 96 px.
     */
    class Window_UFTalk extends Window_Base {
        initialize(rect, portraitSize) {
            this._pSize = portraitSize || PORTRAIT;
            Window_Base.prototype.initialize.call(this, rect);
            this.openness = 0;
            this.opacity = 245;
            this._state = null;
            this._drawn = null;
        }
        /** The person's window (big portrait), as opposed to a companion's. */
        isMain() { return this._pSize >= PORTRAIT; }
        textX() { return this._pSize + 16; }
        textWidth() { return this.innerWidth - this.textX(); }
        textTop() { return this.isMain() ? 52 : 28; }
        /** Lines of speech a page holds (the row under them is kept for the "more" mark). */
        linesPerPage() { return Math.max(1, Math.floor((this.innerHeight - this.textTop() - MORE_H) / LINE_H)); }
        setState(state) {
            this._state = state;
            this.refresh();
        }
        wrap(text, width) {
            const words = String(text || "").split(/\s+/).filter(Boolean);
            const lines = [];
            let cur = "";
            for (const w of words) {
                const next = cur ? `${cur} ${w}` : w;
                if (!cur || this.contents.measureTextWidth(next) <= width) cur = next;
                else {
                    lines.push(cur);
                    cur = w;
                }
            }
            if (cur) lines.push(cur);
            return lines;
        }
        /** The text as pages of wrapped lines at the speech font: every word is kept, a page holds linesPerPage() lines. */
        paginate(text) {
            this.contents.fontSize = TEXT_FONT;
            const lines = this.wrap(text, this.textWidth());
            const per = this.linesPerPage();
            const pages = [];
            for (let i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per));
            if (!pages.length) pages.push([]);
            if (provoked("pages_not_cut") && pages.length > 1) { // the old behaviour: one page, the rest cut off with an ellipsis
                const first = pages[0].slice();
                first[first.length - 1] = `${first[first.length - 1].replace(/\s+\S*$/, "")} …`;
                return [first];
            }
            return pages;
        }
        /** The "more" mark at the bottom right: the word (catalog talk.words.more) and a small down-pointing triangle. */
        drawMore() {
            const c = this.contents;
            const y = this.innerHeight - MORE_H;
            const color = ColorManager.systemColor();
            const tri = 10;
            const right = this.innerWidth - 2;
            c.fontSize = 14;
            c.textColor = color;
            const label = word("more", "more");
            const lw = Math.ceil(c.measureTextWidth(label));
            c.drawText(label, right - tri - 6 - lw, y - 3, lw + 2, MORE_H + 2, "left");
            for (let i = 0; i < tri / 2; i++) c.fillRect(right - tri + i, y + 4 + i, tri - 2 * i, 1, color);
            return { x: right - tri - 6 - lw, y, w: lw + tri + 6, h: MORE_H };
        }
        refresh() {
            const c = this.contents;
            c.clear();
            this.resetFontSettings();
            const st = this._state;
            if (!st) {
                this._drawn = null;
                return;
            }
            const S = this._pSize, main = this.isMain();
            const py = Math.max(0, Math.floor((this.innerHeight - S) / 2));
            const pr = drawPortraitInto(c, st, 0, py, S, () => { if (this._state === st) this.refresh(); }, main ? "window_opens" : null);
            const tx = this.textX(), tw = this.textWidth();
            const labelW = st.stanceLabel ? 170 : 0;
            const title = main && provoked("window_opens") ? "" : st.title;
            c.fontSize = main ? 22 : 19;
            c.textColor = ColorManager.systemColor();
            c.drawText(title, tx, 0, tw - labelW, main ? 30 : 26, "left");
            const titleRect = { x: tx, y: 4, w: Math.min(tw - labelW, Math.ceil(c.measureTextWidth(title)) + 4), h: main ? 24 : 20 };
            if (st.stanceLabel) {
                c.fontSize = 15;
                c.textColor = st.stanceColor || ColorManager.normalColor();
                c.drawText(st.stanceLabel, tx + tw - labelW, 2, labelW, 26, "right");
            }
            if (main && st.subtitle) {
                c.fontSize = 15;
                c.textColor = "#a8b0bc";
                c.drawText(st.subtitle, tx, 30, tw, 22, "left");
            }
            c.fontSize = TEXT_FONT;
            c.textColor = ColorManager.normalColor();
            const lines = (st.lines || []).slice(0, this.linesPerPage());
            const top = this.textTop();
            lines.forEach((l, i) => c.drawText(l, tx, top + i * LINE_H, tw, LINE_H, "left"));
            const moreRect = st.more ? this.drawMore() : null;
            this._drawn = {
                title, subtitle: main ? st.subtitle : "", stanceLabel: st.stanceLabel || "", lines: lines.slice(),
                page: st.page || 1, pages: st.pages || 1, more: !!st.more, moreRect, unitId: st.unitId,
                portrait: Object.assign({}, st.portrait, pr), portraitRect: { x: 2, y: py + 2, w: S - 4, h: S - 4 }, titleRect
            };
        }
        /** What the last refresh drew (tests, tools). */
        drawnState() { return this._drawn ? JSON.parse(JSON.stringify(this._drawn)) : null; }
    }

    /**
     * Your window: the portrait of whoever speaks for you on the left, the keywords beside it (a Window_Command,
     * KW_COLS columns). While the line above still has pages the keywords are dimmed and take no input.
     */
    class Window_UFTalkKeywords extends Window_Command {
        initialize(rect) {
            this._kw = [];
            this._voice = null;
            this._voiceDrawn = null;
            this._waiting = false;
            Window_Command.prototype.initialize.call(this, rect);
            this.openness = 0;
            this.opacity = 245;
            this.deactivate();
        }
        maxCols() { return KW_COLS; }
        lineHeight() { return KW_LINE; }
        itemTextAlign() { return "center"; }
        itemWidth() { return Math.floor((this.innerWidth - KW_X) / this.maxCols()); }
        itemRect(index) {
            const r = Window_Command.prototype.itemRect.call(this, index);
            r.x += KW_X;
            return r;
        }
        resetFontSettings() {
            Window_Command.prototype.resetFontSettings.call(this);
            this.contents.fontSize = 19;
        }
        /** { unitId, name, from, portrait } of whoever speaks for you. */
        setVoice(voice) {
            this._voice = voice ? Object.assign({}, voice) : null;
            this.paint();
        }
        setWaiting(on) {
            if (this._waiting === !!on) return;
            this._waiting = !!on;
            this.paint();
        }
        isWaiting() { return this._waiting; }
        setKeywords(list) {
            const keep = this.currentExt();
            this._kw = list.map(k => Object.assign({}, k));
            this.refresh();
            const at = this._list.findIndex(c => c.ext === keep);
            this.select(Math.max(0, Math.min(this.maxItems() - 1, at >= 0 ? at : 0)));
        }
        makeCommandList() {
            for (const k of this._kw || []) this.addCommand(k.label, "keyword", true, k.id);
        }
        drawAllItems() {
            this.drawVoice();
            Window_Command.prototype.drawAllItems.call(this);
        }
        /** Your portrait, with the speaker's name on a dark band along its bottom edge. */
        drawVoice() {
            const v = this._voice;
            const S = PORTRAIT;
            const y = Math.max(0, Math.floor((this.innerHeight - S) / 2));
            if (!v) {
                this._voiceDrawn = null;
                return;
            }
            const c = this.contents;
            const pr = drawPortraitInto(c, v, 0, y, S, () => { if (this._voice && this._voice.unitId === v.unitId) this.paint(); }, "player_portrait");
            if (pr.drawn && v.name) {
                c.fillRect(2, y + S - 24, S - 4, 22, "rgba(0,0,0,0.55)");
                c.fontSize = 14;
                c.textColor = ColorManager.normalColor();
                c.drawText(v.name, 4, y + S - 24, S - 8, 22, "center");
                this.resetFontSettings();
                this.resetTextColor();
            }
            this._voiceDrawn = { unitId: v.unitId, name: v.name, from: v.from, portrait: Object.assign({}, v.portrait), drawn: pr.drawn, pending: pr.pending, rect: { x: 2, y: y + 2, w: S - 4, h: S - 4 } };
        }
        drawItem(index) {
            const k = this._kw[index];
            const rect = this.itemLineRect(index);
            this.resetTextColor();
            this.changePaintOpacity(!this._waiting && (!k || !k.asked || k.isNew));
            if (k && k.isNew) this.changeTextColor(NEW_COLOR);
            this.drawText(this.commandName(index), rect.x, rect.y, rect.width, "center");
            this.changePaintOpacity(true);
        }
        processCursorMove() {
            Window_Command.prototype.processCursorMove.call(this);
            if (!this.isCursorMovable()) return;
            // The arrow keys and WASD are mapped to camera panning (UF_ColonyOverseer); in a talk they move between keywords.
            const last = this.index();
            if (Input.isRepeated("cameraDown")) this.cursorDown(Input.isTriggered("cameraDown"));
            if (Input.isRepeated("cameraUp")) this.cursorUp(Input.isTriggered("cameraUp"));
            if (Input.isRepeated("cameraRight")) this.cursorRight(Input.isTriggered("cameraRight"));
            if (Input.isRepeated("cameraLeft")) this.cursorLeft(Input.isTriggered("cameraLeft"));
            if (this.index() !== last) this.playCursorSound();
        }
        labels() { return (this._kw || []).map(k => k.label); }
        keywords() { return (this._kw || []).map(k => Object.assign({}, k)); }
        /** What the last paint drew of your portrait (tests, tools), or null. */
        voiceDrawn() { return this._voiceDrawn ? JSON.parse(JSON.stringify(this._voiceDrawn)) : null; }
    }

    //-------------------------------------------------------------------------
    // The conversation (view state: not saved; the facts it shows are read from the saved world)

    // convo: { unitId, mode, stance, keywords, asked, line, chime, seq, pageAt, inputLock, closing, pausedByTalk, portrait,
    //         voice, win, kwWin, compWin }. seq is the pages of the current line, then the companion's pages:
    //         [{ who: "speaker" | "companion", unitId, lines, i, of }]; pageAt the one shown now.
    let convo = null;
    const graveyard = [];    // closed windows, removed once their close animation ends
    let lastSocial = null;
    const tickStats = { frames: 0, ms: 0 };

    function stanceLabelFor(u, mode) {
        const labels = Object.assign({ own: "one of yours", friendly: "friendly", wary: "wary", hostile: "hostile", baby: "baby" }, T().stanceLabels || {});
        if (mode === "own" && u.data && u.data.mood) return String(u.data.mood);
        return capFirst(labels[mode] || mode || "");
    }
    function subtitleFor(u) {
        const stages = T().stages || {};
        const stage = stageOf(u);
        const f = factionOf(u);
        return [capFirst(stages[stage] || stage), f ? f.name : ""].filter(Boolean).join(" · ");
    }
    function stateFor(u) {
        return {
            unitId: u.id, title: u.name, subtitle: subtitleFor(u), stanceLabel: stanceLabelFor(u, convo.mode),
            stanceColor: STANCE_COLORS[convo.mode] || ColorManager.normalColor(), line: convo.line, portrait: convo.portrait
        };
    }
    /** { unitId, name, from, portrait } for your window: the voice's portrait, or an emblem in your faction's colour. */
    function voiceState(u) {
        const v = voiceOf(u);
        if (v) return { unitId: v.unit.id, name: v.unit.name, from: v.from, portrait: portraitOf(v.unit) };
        const F = Factions();
        const pf = F && F.player ? F.player() : null;
        return { unitId: null, name: pf ? pf.name : "", from: "emblem", portrait: { kind: "emblem", color: pf && pf.color ? pf.color : null, from: "code (nobody of yours can speak)" } };
    }
    function addKeyword(add, u) {
        if (!add || !add.id || !convo) return false;
        if (add.topic === "person" && add.ref === u.id) return false; // not themselves
        if (convo.keywords.some(k => k.id === add.id)) return false;
        const kw = Object.assign({ asked: false }, add, { isNew: true });
        const bye = convo.keywords.findIndex(k => k.id === "bye");
        convo.keywords.splice(bye < 0 ? convo.keywords.length : bye, 0, kw);
        return true;
    }
    /** The line to show: its pages in the person's window, then the companion's pages (if one chimes in). */
    function setLine(text, chime) {
        convo.line = text;
        convo.chime = chime || null;
        const seq = [];
        const sp = convo.win ? convo.win.paginate(text) : [[text]];
        sp.forEach((lines, i) => seq.push({ who: "speaker", unitId: convo.unitId, lines, i, of: sp.length }));
        if (chime) {
            const cp = convo.compWin ? convo.compWin.paginate(chime.text) : [[chime.text]];
            cp.forEach((lines, i) => seq.push({ who: "companion", unitId: chime.unitId, lines, i, of: cp.length }));
        }
        convo.seq = seq;
        convo.pageAt = 0;
        convo.inputLock = INPUT_LOCK;
    }
    const pagesLeft = () => (convo ? Math.max(0, convo.seq.length - 1 - convo.pageAt) : 0);
    /** The keywords take input only when the last page is shown and no farewell is running. */
    function updateInput() {
        if (!convo || !convo.kwWin) return;
        const waiting = pagesLeft() > 0;
        convo.kwWin.setWaiting(waiting);
        if (waiting || convo.closing > 0) convo.kwWin.deactivate();
        else convo.kwWin.activate();
    }
    function redraw() {
        if (!convo) return;
        const u = unitById(convo.unitId);
        const seq = convo.seq.length ? convo.seq : [{ who: "speaker", unitId: convo.unitId, lines: [], i: 0, of: 1 }];
        const at = Math.max(0, Math.min(convo.pageAt, seq.length - 1));
        const last = at >= seq.length - 1;
        let sp = null, cp = null;
        for (let i = 0; i <= at; i++) {
            if (seq[i].who === "speaker") sp = seq[i];
            else cp = seq[i];
        }
        if (u && convo.win) {
            convo.win.setState(Object.assign(stateFor(u), {
                lines: sp ? sp.lines : [], page: sp ? sp.i + 1 : 1, pages: sp ? sp.of : 1, more: !last && seq[at].who === "speaker"
            }));
        }
        if (convo.compWin) {
            const cu = cp ? unitById(cp.unitId) : null;
            if (cu && convo.chime) {
                convo.compWin.setState({
                    unitId: cu.id, title: cu.name, subtitle: "", stanceLabel: "", portrait: convo.chime.portrait,
                    lines: cp.lines, page: cp.i + 1, pages: cp.of, more: !last && seq[at].who === "companion"
                });
                convo.compWin.open();
            } else if (!convo.compWin.isClosed()) convo.compWin.close();
        }
        if (convo.kwWin) convo.kwWin.setKeywords(convo.keywords);
    }
    function layerOf() {
        const s = SceneManager._scene;
        return s instanceof Scene_Map && s._windowLayer ? s._windowLayer : null;
    }

    const Talk = {
        PORTRAIT, COMP_PORTRAIT, BYE_FRAMES, SOCIAL_RELIEF, KW_COLS, KW_ROWS, INPUT_LOCK, CHIME_RANGE, CHIME_CHANCE, BANNED,
        TalkWindow: Window_UFTalk,
        KeywordWindow: Window_UFTalkKeywords,
        isTalkable,
        isOwn,
        stanceOf,
        modeOf,
        stageOf,
        lineFor,
        initialKeywords: u => initialKeywords(u, modeOf(u)).map(k => Object.assign({}, k)),
        portraitOf,
        genFace,
        genEmblem,
        /** Whoever speaks for you in a talk with this unit: { unitId, from: "selected" | "ruler" | "nearest" }, or null. */
        voiceOf(unitOrId) {
            const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
            const v = u ? voiceOf(u) : null;
            return v ? { unitId: v.unit.id, from: v.from } : null;
        },
        /** Ids of your people who could chime in on a talk with this unit (nearest first), your voice excluded. */
        companionsOf(unitOrId, voiceId = null) {
            const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
            return companionsOf(u, voiceId).map(v => v.id);
        },
        /** A companion's line after this unit answered `key` with a line whose keywords are `adds`: { unitId, name, variants, text, adds, portrait } or null. */
        chimeFor(unitOrId, key, n = 0, adds = [], voiceId = null) {
            const r = chimeFor(unitOrId, key, n, adds, voiceId);
            return r ? Object.assign({}, r, { adds: r.adds.slice(), variants: r.variants.slice(), portrait: Object.assign({}, r.portrait) }) : null;
        },
        templates: () => T(),
        facts(unitOrId) {
            const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
            if (!u) return null;
            const doing = doingOf(u), home = homeOf(u), news = newsFor(u), partner = partnerOf(u), leader = leaderOf(u), sup = superiorOf(u);
            return {
                id: u.id, name: u.name, mode: modeOf(u), stage: stageOf(u), faction: factionOf(u) ? factionOf(u).id : null,
                doing: doing ? doing.text : null, partner: partner ? partner.id : null, children: childrenOf(u).map(c => c.id),
                leader: leader ? leader.id : null, superior: sup ? sup.id : null, home: home ? { x: home.x, y: home.y, site: home.site ? home.site.id : null } : null,
                knows: knownFactions(u).map(f => f.id), news: news ? news.text : null
            };
        },
        /** Open a conversation with a person (unit or id). Returns current() or null (not talkable, not on the map). */
        open(unitOrId) {
            const u = typeof unitOrId === "number" ? unitById(unitOrId) : unitOrId;
            const layer = layerOf();
            if (!u || !isTalkable(u) || !layer) return null;
            if (convo) Talk.closeNow();
            const mode = modeOf(u);
            convo = {
                unitId: u.id, mode, stance: stanceOf(u), keywords: initialKeywords(u, mode), asked: {}, line: "", chime: null, seq: [], pageAt: 0,
                inputLock: INPUT_LOCK, closing: 0, pausedByTalk: false, portrait: portraitOf(u), voice: voiceState(u), win: null, kwWin: null, compWin: null
            };
            // Three windows from the bottom up: yours (portrait + keywords), the person's, a companion's (opens when one chimes in).
            const w = Graphics.boxWidth - MARGIN * 2;
            const kwH = PORTRAIT + $gameSystem.windowPadding() * 2;
            const kwRect = new Rectangle(MARGIN, Graphics.boxHeight - MARGIN - kwH, w, kwH);
            const mainRect = new Rectangle(MARGIN, kwRect.y - GAP - MAIN_H, w, MAIN_H);
            const compRect = new Rectangle(MARGIN, mainRect.y - GAP - COMP_H, w, COMP_H);
            const compWin = new Window_UFTalk(compRect, COMP_PORTRAIT);
            const win = new Window_UFTalk(mainRect, PORTRAIT);
            const kwWin = new Window_UFTalkKeywords(kwRect);
            kwWin.setHandler("keyword", () => Talk.ask(kwWin.currentExt()));
            kwWin.setHandler("cancel", () => Talk.ask("bye"));
            SceneManager._scene.addWindow(compWin);
            SceneManager._scene.addWindow(win);
            SceneManager._scene.addWindow(kwWin);
            convo.win = win;
            convo.kwWin = kwWin;
            convo.compWin = compWin;
            kwWin.setVoice(convo.voice);
            const greet = lineFor(u, "greet", 0);
            if (mode !== "hostile" && mode !== "baby" && !provoked("new_keyword_appears")) for (const a of greet.adds) addKeyword(a, u);
            const chime = chimeFor(u, "greet", 0, greet.adds, convo.voice.unitId);
            if (chime && !provoked("new_keyword_appears")) for (const a of chime.adds) addKeyword(a, u);
            for (const k of convo.keywords) k.isNew = false; // the greeting's names are there from the start, not "new"
            setLine(greet.text, chime);
            redraw();
            kwWin.select(0);
            win.open();
            kwWin.open(); // input only once fully open (Window_Selectable needs isOpenAndActive), so the click that chose Talk can't pick a keyword
            updateInput();
            const Tm = Time();
            if (Tm && !Tm.paused) convo.pausedByTalk = Tm.pause() !== false;
            emit("talk:opened", u, mode);
            if (chime) emit("talk:chimed", unitById(chime.unitId), u, chime.text);
            return Talk.current();
        },
        /** Ask about a keyword (id, or label, case-insensitive). Returns the line, or null (nothing open, unknown keyword, refused). */
        ask(which) {
            if (!Talk.isOpen() || convo.closing > 0) return null;
            const want = String(which === undefined || which === null ? "" : which).toLowerCase();
            const kw = convo.keywords.find(k => k.id === which) || convo.keywords.find(k => k.id.toLowerCase() === want || k.label.toLowerCase() === want);
            if (!kw) return null;
            const u = unitById(convo.unitId);
            if (!u) {
                Talk.closeNow();
                return null;
            }
            if ((convo.mode === "hostile" || convo.mode === "baby") && kw.id !== "bye") return null;
            const n = convo.asked[kw.id] || 0;
            const res = lineFor(u, kw.id, n, kw.label);
            convo.asked[kw.id] = n + 1;
            kw.asked = true;
            for (const k of convo.keywords) k.isNew = false;
            if (!provoked("new_keyword_appears")) for (const a of res.adds) addKeyword(a, u);
            const chime = kw.id === "bye" ? null : chimeFor(u, kw.id, n, res.adds, convo.voice ? convo.voice.unitId : null);
            if (chime && !provoked("new_keyword_appears")) for (const a of chime.adds) addKeyword(a, u);
            setLine(res.text, chime);
            if (kw.id === "bye") convo.closing = BYE_FRAMES;
            redraw();
            updateInput();
            emit("talk:asked", u, kw.id, res.text);
            if (chime) emit("talk:chimed", unitById(chime.unitId), u, chime.text);
            return res.text;
        },
        /** Show the next page (click, Enter, Z or Space do this while pages remain). Returns false when there is none. */
        next() {
            if (!Talk.isOpen() || pagesLeft() <= 0) return false;
            convo.pageAt++;
            redraw();
            updateInput();
            return true;
        },
        /** Jump to the last page (right-click or Esc while pages remain). Returns false when it is already shown. */
        skip() {
            if (!Talk.isOpen() || pagesLeft() <= 0) return false;
            convo.pageAt = convo.seq.length - 1;
            redraw();
            updateInput();
            return true;
        },
        /** Pages still to come after the one shown (the person's, then the companion's). */
        pagesLeft: () => (Talk.isOpen() ? pagesLeft() : 0),
        /** Close now (no farewell). The world runs again if this talk paused it. */
        closeNow() {
            if (!convo) return false;
            const c = convo;
            convo = null;
            for (const w of [c.compWin, c.win, c.kwWin]) {
                if (!w) continue;
                w.deactivate();
                w.close();
                graveyard.push(w);
            }
            const u = unitById(c.unitId);
            if (u && isOwn(u) && Object.keys(c.asked).some(k => k !== "bye")) Talk.easeSocial(u);
            const Tm = Time();
            if (c.pausedByTalk && Tm && Tm.paused && !provoked("bye_closes_and_resumes")) Tm.resume();
            emit("talk:closed", u || null);
            return true;
        },
        /** Say goodbye: the farewell line shows, then the window closes. */
        close() {
            if (!Talk.isOpen()) return false;
            if (convo.mode !== undefined && convo.closing <= 0) Talk.ask("bye");
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
        isOpen() {
            if (!convo) return false;
            const layer = layerOf();
            if (!layer || !convo.win || convo.win.parent !== layer) { // the scene changed under it
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
            const v = convo.voice || {};
            return {
                unitId: convo.unitId, name: u ? u.name : "", mode: convo.mode, stance: convo.stance, line: convo.line, closing: convo.closing,
                pausedByTalk: convo.pausedByTalk, portrait: Object.assign({}, convo.portrait), asked: Object.assign({}, convo.asked),
                keywords: convo.keywords.map(k => Object.assign({}, k)),
                page: convo.pageAt + 1, pages: convo.seq.length, pagesLeft: pagesLeft(),
                showing: convo.seq[convo.pageAt] ? convo.seq[convo.pageAt].who : "speaker",
                voice: { unitId: v.unitId === undefined ? null : v.unitId, name: v.name || "", from: v.from || "" },
                chime: convo.chime ? { unitId: convo.chime.unitId, name: convo.chime.name, text: convo.chime.text, variants: convo.chime.variants.slice() } : null
            };
        },
        keywords: () => (Talk.isOpen() ? convo.keywords.map(k => k.label) : []),
        line: () => (Talk.isOpen() ? convo.line : ""),
        window: () => (Talk.isOpen() ? convo.win : null),
        keywordWindow: () => (Talk.isOpen() ? convo.kwWin : null),
        companionWindow: () => (Talk.isOpen() ? convo.compWin : null),
        /** Per frame (Scene_Map.update): page turning, the farewell countdown and the removal of closed windows. */
        tick() {
            const t0 = performance.now();
            try {
                Talk.tickBody();
            } finally {
                if (provoked("perf")) { const until = performance.now() + 2; while (performance.now() < until) { /* test-only busy wait */ } }
                tickStats.frames++;
                tickStats.ms += performance.now() - t0;
            }
        },
        /** { frames, ms } of tick() since the last resetStats() (the perf check). */
        stats: () => Object.assign({}, tickStats),
        resetStats() { tickStats.frames = 0; tickStats.ms = 0; },
        tickBody() {
            for (let i = graveyard.length - 1; i >= 0; i--) {
                const w = graveyard[i];
                if (w.isClosed() || !w.parent) {
                    graveyard.splice(i, 1);
                    try {
                        if (w.parent) w.parent.removeChild(w);
                        w.destroy();
                    } catch (e) { /* gone with its scene */ }
                }
            }
            if (!Talk.isOpen()) return;
            // Pages: the keywords are inactive while pages remain, so these inputs belong to the talk. A click is read on
            // release (isClicked), the same event the keyword window acts on, so the click that turns the last page
            // can't also pick the keyword under the pointer. The lock skips the frames in which a line appeared.
            if (convo.inputLock > 0) convo.inputLock--;
            else if (pagesLeft() > 0 && convo.win && convo.win.isOpen()) {
                if (Input.isTriggered("ok") || TouchInput.isClicked()) {
                    Talk.next();
                    SoundManager.playCursor();
                } else if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
                    Talk.skip();
                    SoundManager.playCursor();
                }
            }
            if (convo && convo.closing > 0 && pagesLeft() === 0 && --convo.closing === 0) Talk.closeNow();
        },
        /** The context-menu entry for a cell (or null): used by the UF.Interact wrap. */
        optionFor(x, y) {
            const L = Look();
            const hit = L && L.unitAt ? L.unitAt(x, y) : null;
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
    window.UF = window.UF || {};
    window.UF.Talk = Talk;

    //-------------------------------------------------------------------------
    // Hooks: the Talk entry in UF_Interact's menu, input while talking, the per-frame tick

    function hookInteract() {
        const I = Interact();
        if (!I || I._ufTalkHooked) return !!I;
        I._ufTalkHooked = true;
        const _optionsFor = I.optionsFor;
        I.optionsFor = function(x, y) {
            return Talk.withTalk(_optionsFor.call(this, x, y), x, y);
        };
        // While a talk is open the map takes no mouse input: no context menu, no select, move or deselect (the
        // Overseer's controls run only when this returns false).
        const _handleMouse = I.handleMouse;
        I.handleMouse = function() {
            if (Talk.isOpen()) return true;
            return _handleMouse.apply(this, arguments);
        };
        // A talk is modal: the whole screen counts as UI, so UF_Look's map tooltip stays hidden instead of drawing
        // over the portrait when the pointer is beside the windows.
        const L = Look();
        if (L && typeof L.isOverUI === "function" && !L._ufTalkHooked) {
            L._ufTalkHooked = true;
            const _isOverUI = L.isOverUI;
            L.isOverUI = function() {
                if (Talk.isOpen() && !provoked("window_opens")) return true;
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

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        Talk.tick();
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
            const K = Object.assign({}, FALLBACK.keywords, T().keywords || {});
            const fx = { units: [], relations: [], met: null, partner: null, rank: null, pausedByTest: false };
            const cellOf = u => {
                const ev = W.eventOf(u.id);
                return ev ? { x: ev.x, y: ev.y } : { x: u.x, y: u.y };
            };
            const inLayer = w => !!w && w.parent === layerOf();
            const centerOn = u => {
                const c = cellOf(u);
                $gameMap.setDisplayPos(c.x - $gameMap.screenTileX() / 2 + 0.5, c.y - $gameMap.screenTileY() * 0.28);
            };
            const tplRegex = tpl => new RegExp(`^${String(tpl).replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{\w+\}/g, ".+?")}$`, "i");
            const fromTemplates = (line, list) => (Array.isArray(list) ? list : []).some(tpl => tplRegex(tpl).test(String(line || "")));
            const pause = () => { if (Tm && !Tm.paused) Tm.pause(); fx.pausedByTest = true; };
            const run = () => { if (Tm && Tm.paused) Tm.resume(); fx.pausedByTest = false; };
            const failAll = why => {
                for (const n of ["option_listed", "window_opens", "name_and_job", "topics_from_state", "new_keyword_appears", "hostile_refuses", "bye_closes_and_resumes", "no_banned_words", "lines_well_formed", "perf", "player_portrait", "pages_not_cut", "companion_chimes"]) t.check(n, false, why);
            };

            try {
                let ready = true;
                try {
                    await t.waitUntil(() => W && W.currentArea() && I && F && C && C.list().some(u => sameArea(u.area, W.currentArea()) && W.eventOf(u.id)), 20000, "colonists on the map");
                } catch (e) {
                    ready = false;
                }
                if (!ready) {
                    failAll(`not ready: area ${W && W.currentArea() ? "yes" : "no"}, UF.Interact ${!!I}, UF.Factions ${!!F}, UF.Colonists ${!!C}, colonists here ${C ? C.list().length : 0}`);
                    return;
                }
                const area = W.currentArea();
                pause();
                await t.waitFrames(2);

                // The people: A (a colonist, not the ruler), A's partner, the leader; two strangers and a hare placed by the test.
                const adultStage = u => ["adult", "elder"].includes(stageOf(u));
                const cols = C.list().filter(u => sameArea(u.area, area) && W.eventOf(u.id) && isAlive(u));
                // The top of a faction's ladder, read straight from unit.data (rank >= 1, highest first, lowest id on a tie).
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
                const spawn = (name, dx, dy, data, image) => {
                    const u = W.addUnit({ name, image: { characterName: image, characterIndex: 0 }, area, x: A.x + dx, y: A.y + dy, dir: 2, snapToFree: 6, data });
                    fx.units.push(u);
                    return u;
                };
                const stranger = spawn("TEST_talker", 2, 1, { kind: "person", faction: fFriend.id, species: fFriend.species, gender: "female", age: 34, ai: null }, peopleImage(fFriend.species));
                const grump = spawn("TEST_grump", -2, 1, { kind: "person", faction: fHostile.id, species: fHostile.species, gender: "male", age: 40, ai: null }, peopleImage(fHostile.species));
                const hareSp = catalog() && catalog().wildlife && Array.isArray(catalog().wildlife.species) ? catalog().wildlife.species.find(s => s.id === "hare") : null;
                const hare = spawn("TEST_hare", 0, 3, { kind: "creature", species: "hare", tags: ["grazer"], ai: null }, hareSp && hareSp.image ? hareSp.image : "$U7_Hare");
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
                    t.check("option_listed", ok, `colonist ${A.name} at (${ca.x},${ca.y}): ${tA ? `"${tA.label}"` : "NO Talk"}; stranger at (${cs.x},${cs.y}): ${tS ? `"${tS.label}"` : "NO Talk"}; `
                        + `hare at (${ch.x},${ch.y}): ${tH ? `"${tH.label}" (should not be there)` : "no Talk"}, options [${oH.map(o => o.id).join(", ")}]; real menu rows [${menuLabels.join(" | ")}]`);
                }

                // talk.window_opens: choose Talk in the real menu while the world runs; portrait, name line and keywords drawn.
                centerOn(A);
                run();
                await t.waitFrames(6);
                let c2 = cellOf(A);
                const menu = I.open(c2.x, c2.y, { x: 120, y: 90 });
                if (menu) I.choose("Talk");
                const openedByMenu = Talk.isOpen() && Talk.current().unitId === A.id;
                if (!openedByMenu) Talk.open(A.id); // so the rest can still run; the check below records the failure
                const pausedWhileOpen = !!(Tm && Tm.paused);
                const pausedByTalk = !!(Talk.current() && Talk.current().pausedByTalk);
                try {
                    await t.waitUntil(() => Talk.isOpen() && Talk.window().isOpen() && Talk.keywordWindow().isOpen() && Talk.window().drawnState() && !Talk.window().drawnState().portrait.pending, 5000, "the talk windows to open");
                } catch (e) { /* reported below */ }
                {
                    // The pointer over the map above the windows: UF_Look's tooltip must stay hidden while the talk is open.
                    const L = Look();
                    const px = TouchInput._x, py = TouchInput._y;
                    TouchInput._x = Math.round(Graphics.width / 2);
                    TouchInput._y = 60;
                    await t.waitFrames(3);
                    const tipSprite = L && L.sprite ? L.sprite() : null;
                    const tipHidden = !tipSprite || !tipSprite.visible;
                    TouchInput._x = px;
                    TouchInput._y = py;
                    const win = Talk.window(), kw = Talk.keywordWindow();
                    const drawn = win ? win.drawnState() : null;
                    let alpha = 0, alpha2 = 0, ink = 0;
                    if (drawn) {
                        const pr = drawn.portraitRect, tr = drawn.titleRect;
                        alpha = win.contents.getAlphaPixel(Math.floor(pr.x + pr.w / 2), Math.floor(pr.y + pr.h / 2));
                        alpha2 = win.contents.getAlphaPixel(Math.floor(pr.x + pr.w / 2), Math.floor(pr.y + pr.h * 0.3));
                        for (let y = tr.y; y < tr.y + tr.h; y += 2) for (let x = tr.x; x < tr.x + tr.w; x += 2) if (win.contents.getAlphaPixel(x, y) > 0) ink++;
                    }
                    const labels = kw ? kw.labels() : [];
                    const ok = openedByMenu && inLayer(win) && inLayer(kw) && win.visible && win.isOpen() && kw.isOpen() && kw.active && alpha > 0 && alpha2 > 0
                        && !!drawn && drawn.title === A.name && ink > 20 && [K.name, K.job, K.bye].every(l => labels.includes(l)) && drawn.lines.join(" ").length > 0 && tipHidden;
                    t.check("window_opens", ok, `opened from the menu: ${openedByMenu}; windows in the layer ${inLayer(win)}/${inLayer(kw)}, open ${win && win.isOpen()}/${kw && kw.isOpen()}, keywords active ${kw && kw.active}; `
                        + `map tooltip ${tipSprite ? (tipHidden ? "hidden" : `VISIBLE ("${L.text().split("\n")[0]}")`) : "absent"} with the pointer over the map; `
                        + `portrait ${drawn ? `${drawn.portrait.kind} ${drawn.portrait.sheet || drawn.portrait.name || ""}${drawn.portrait.sheet ? `:${drawn.portrait.index}` : ""} (${drawn.portrait.from}), alpha ${alpha}/${alpha2}` : "none"}; `
                        + `title "${drawn ? drawn.title : ""}" (${ink} inked px); line "${drawn ? drawn.lines.join(" ") : ""}"; keywords [${labels.join(", ")}]`);
                }

                // "family" first: the partner's name must not be a keyword yet (talk.new_keyword_appears).
                const before = Talk.current().keywords.map(k => k.id);
                const famLine = Talk.ask(K.family) || "";
                const pKw = Talk.current().keywords.find(k => k.id === `person:${partner.id}`) || null;
                const kwShown = Talk.keywordWindow() ? Talk.keywordWindow().labels() : [];
                await t.waitFrames(3);
                t.screenshot("colonist");

                // talk.name_and_job: the real name, and the current job's own text (the world is paused, so the job can't change).
                {
                    const nameLine = Talk.ask(K.name) || "";
                    const shown = Talk.window() ? Talk.window().drawnState().lines.join(" ") : "";
                    const job = J && J.of ? J.of(A.id) : null;
                    const jobText = job ? J.describe(job) : null;
                    const jobLineTxt = Talk.ask(K.job) || "";
                    const idleOk = !job && jobLineTxt.length > 0 && Array.isArray(T().job && T().job.idle) && T().job.idle.some(s => jobLineTxt.startsWith(s));
                    const jobOk = jobText ? jobLineTxt.toLowerCase().includes(jobText.toLowerCase()) : idleOk;
                    t.check("name_and_job", nameLine.includes(A.name) && shown.includes(A.name) && jobOk,
                        `name: "${nameLine}" (want ${A.name}; window shows "${shown}"); job now: ${jobText ? `"${jobText}"` : "none (idle)"}; job line: "${jobLineTxt}"`);
                }

                // talk.topics_from_state + talk.new_keyword_appears
                {
                    const fShort = shortName(faction.name);
                    const facKw = Talk.current().keywords.find(k => k.id === `faction:${faction.id}`) || null;
                    const facLine = facKw ? Talk.ask(facKw.id) || "" : "";
                    const lKw = Talk.current().keywords.find(k => k.id === `person:${leader.id}`) || null;
                    const leaderLine = lKw ? Talk.ask(lKw.id) || "" : "";
                    t.check("topics_from_state", famLine.includes(partner.name) && facLine.toLowerCase().includes(fShort.toLowerCase()) && facLine.includes(leader.name) && leaderLine.includes(leader.name),
                        `partner ${partner.name} (#${partner.id}, ${partnerFrom}) → family: "${famLine}"; faction ${faction.name} → ${facKw ? `"${facLine}"` : "no faction keyword"}; `
                        + `leader ${leader.name} (#${leader.id}, rank ${leader.data.rank | 0}, ${leaderFrom}) → ${lKw ? `"${leaderLine}"` : "no leader keyword"}`);
                    const partnerLine = pKw ? Talk.ask(pKw.id) || "" : "";
                    t.check("new_keyword_appears", !before.includes(`person:${partner.id}`) && !!pKw && pKw.isNew && kwShown.includes(partner.name) && partnerLine.includes(partner.name),
                        `before "family": [${before.join(", ")}]; after: ${pKw ? `"${pKw.label}" (new ${pKw.isNew})` : "no partner keyword"}; keyword window [${kwShown.join(", ")}]; asking it: "${partnerLine}"`);
                }

                // talk.bye_closes_and_resumes (part 1): the world stood still while open; bye closes the windows and it runs again.
                const tick0 = Tm ? Tm.ticks() : 0;
                await t.waitFrames(20);
                const tick1 = Tm ? Tm.ticks() : 0;
                const winA = Talk.window(), kwA = Talk.keywordWindow();
                const byeLineA = Talk.ask(K.bye) || "";
                let closedA = true;
                try {
                    await t.waitUntil(() => !Talk.isOpen() && !winA.parent && !kwA.parent, 4000, "the talk windows to close");
                } catch (e) { closedA = false; }
                const resumedA = !!Tm && !Tm.paused;
                const tick2 = Tm ? Tm.ticks() : 0;
                await t.waitFrames(30);
                const tick3 = Tm ? Tm.ticks() : 0;
                const part1 = pausedWhileOpen && pausedByTalk && tick1 === tick0 && byeLineA.length > 0 && closedA && resumedA && tick3 - tick2 >= 10;
                const part1Text = `running before; open: paused ${pausedWhileOpen} (by the talk ${pausedByTalk}), ticks ${tick0}→${tick1} over 20 frames; bye "${byeLineA}"; `
                    + `closed and removed ${closedA}; running after ${resumedA}, ticks +${tick3 - tick2} over 30 frames`;

                // talk.hostile_refuses: a stranger of a faction at war refuses; a friendly one talks.
                pause();
                await t.waitFrames(2);
                {
                    fx.relations.some(r => r[0] === fHostile.id) || fx.relations.push([fHostile.id, F.relation("player", fHostile.id)]);
                    F.setRelation("player", fHostile.id, -80);
                    const cg = cellOf(grump);
                    const hasOption = I.optionsFor(cg.x, cg.y).some(o => o.id === "talk");
                    const opened = Talk.open(grump.id);
                    const refLine = opened ? opened.line : "";
                    const refused = !!opened && opened.mode === "hostile" && fromTemplates(refLine, T().refuse);
                    const onlyBye = !!opened && opened.keywords.map(k => k.id).join(",") === "bye";
                    const nameAnswer = Talk.ask(K.name);
                    const unchanged = Talk.line() === refLine;
                    Talk.closeNow();
                    F.setRelation("player", fHostile.id, fx.relations.find(r => r[0] === fHostile.id)[1]);
                    const fr = Talk.open(stranger.id);
                    const friendlyOk = !!fr && fr.mode === "friendly" && fromTemplates(fr.line, T().greet && T().greet.friendly) && fr.keywords.some(k => k.id === "name") && fr.keywords.some(k => k.id === "job");
                    t.check("hostile_refuses", hasOption && refused && onlyBye && nameAnswer === null && unchanged && friendlyOk,
                        `${grump.name} of ${fHostile.name} at war (-80): Talk offered ${hasOption}; mode ${opened ? opened.mode : "not opened"}, line "${refLine}" (a refuse template ${refused}); keywords [${opened ? opened.keywords.map(k => k.label).join(", ") : ""}]; `
                        + `asking "${K.name}" gave ${nameAnswer === null ? "nothing" : `"${nameAnswer}"`}; ${stranger.name} of ${fFriend.name} at +30: mode ${fr ? fr.mode : "not opened"}, "${fr ? fr.line : ""}", keywords [${fr ? fr.keywords.map(k => k.label).join(", ") : ""}]`);
                    Talk.closeNow();
                }

                // Screenshot: a stranger (a real one of another faction on this map when there is one that isn't hostile, else TEST_talker).
                await t.waitFrames(12);
                const reals = W.unitsInArea(area.x, area.y).filter(u => isTalkable(u) && !isOwn(u) && !fx.units.includes(u) && stanceOf(u) !== "hostile" && W.eventOf(u.id) && stageOf(u) !== "baby");
                const view = { x: $gameMap.displayX() + $gameMap.screenTileX() / 2, y: $gameMap.displayY() + $gameMap.screenTileY() / 2 };
                reals.sort((a, b) => Math.hypot(a.x - view.x, a.y - view.y) - Math.hypot(b.x - view.x, b.y - view.y));
                const shotWith = reals[0] || stranger;
                centerOn(shotWith);
                const opened2 = Talk.open(shotWith.id);
                try {
                    await t.waitUntil(() => Talk.isOpen() && Talk.window().isOpen() && Talk.window().drawnState() && !Talk.window().drawnState().portrait.pending, 5000, "the stranger's talk window");
                } catch (e) { /* the screenshot shows it */ }
                Talk.ask(K.name);
                const sf = resolveFaction(shotWith.data.faction);
                const sKw = Talk.current() ? Talk.current().keywords.find(k => k.id === `faction:${sf}`) : null;
                if (sKw) Talk.ask(sKw.id);
                await t.waitFrames(3);
                t.screenshot("stranger");
                const strangerNote = `stranger shot: ${shotWith.name} (${reals[0] ? "a real person of this map" : "the test's TEST_talker"}), faction ${sf}, line "${Talk.line()}"`;

                // talk.bye_closes_and_resumes (part 2): a talk opened while the world was already paused leaves it paused.
                const winB = Talk.window();
                const pausedBefore2 = !!(opened2 && !opened2.pausedByTalk && Tm && Tm.paused);
                Talk.ask(K.bye);
                let closedB = true;
                try {
                    await t.waitUntil(() => !Talk.isOpen() && (!winB || !winB.parent), 4000, "the stranger's talk to close");
                } catch (e) { closedB = false; }
                const stillPaused = !!(Tm && Tm.paused);
                t.check("bye_closes_and_resumes", part1 && pausedBefore2 && closedB && stillPaused,
                    `${part1Text}; paused before the second talk ${pausedBefore2}, closed ${closedB}, still paused after ${stillPaused}`);

                // talk.no_banned_words: every template string, and at least 200 generated lines over every topic of every speaker.
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
                    const lines = [];
                    for (let n = 0; n < 4 && lines.length < 200; n++) {
                        for (const u of speakers) {
                            const keys = ["greet", "bye"].concat(initialKeywords(u, modeOf(u) === "hostile" || modeOf(u) === "baby" ? "wary" : modeOf(u)).map(k => k.id));
                            const extra = [];
                            for (const key of keys) {
                                const r = lineFor(u, key, n);
                                lines.push(r.text);
                                for (const a of r.adds) if (!extra.includes(a.id)) extra.push(a.id);
                            }
                            for (const key of extra) lines.push(lineFor(u, key, n).text);
                        }
                    }
                    const badG = lines.filter(s => BANNED.test(s));
                    const malformed = lines.filter(s => !s || /\{\w+\}/.test(s) || s.split(/(?<=[.?!])\s+/).some(p => /^["(]?[a-z]/.test(p)));
                    t.check("lines_well_formed", lines.length >= 200 && !malformed.length, `${lines.length} generated lines, ${malformed.length} empty, with an unfilled {slot}, or with a sentence starting in lower case${malformed.length ? `; first: "${malformed[0]}"` : ""}`);
                    t.check("no_banned_words", strings.length >= 50 && lines.length >= 200 && !badT.length && !badG.length,
                        `${strings.length} template strings (catalog "talk" ${catalog() && catalog().talk ? "present" : "MISSING, fallback used"}), ${badT.length} with a banned word${badT.length ? `: "${badT[0]}"` : ""}; `
                        + `${lines.length} generated lines from ${speakers.length} speakers, ${badG.length} with a banned word${badG.length ? `: "${badG[0]}"` : ""}; sample: "${lines[7] || ""}" / "${lines[lines.length - 1] || ""}"; ${strangerNote}`);
                }

                // talk.perf: per-frame cost with a talk open (budget 0.2 ms), and the cost of one line (budget 2 ms; per click, not per frame).
                {
                    Talk.open(stranger.id);
                    Talk.resetStats();
                    await t.waitFrames(90);
                    const st = Talk.stats();
                    const perFrame = st.frames ? st.ms / st.frames : Infinity;
                    const keys = ["name", "job", "family", "home", "mood", "others", "news", `faction:${fid}`, `person:${partner.id}`, `person:${leader.id}`];
                    const t0 = performance.now();
                    let made = 0;
                    for (let n = 0; n < 5; n++) for (const u of [A, stranger]) for (const key of keys) { lineFor(u, key, n); made++; }
                    const perLine = (performance.now() - t0) / made;
                    Talk.closeNow();
                    t.check("perf", perFrame <= 0.2 && perLine <= 2, `tick ${perFrame.toFixed(4)} ms per frame over ${st.frames} frames with a talk open; ${perLine.toFixed(3)} ms per line over ${made} lines (${W.units().length} units in the world)`);
                }

                // The V62 layout. Helpers: open a talk and wait until its windows are open and every portrait is drawn.
                const cm = window.$colonyManager;
                const selBefore = cm && cm.selectedColonist ? cm.selectedColonist.id : null;
                const restoreSel = () => {
                    if (!cm) return;
                    if (selBefore !== null && selBefore !== undefined && typeof cm.select === "function") cm.select(selBefore);
                    else if (typeof cm.deselect === "function") cm.deselect();
                };
                const openAndWait = async (id, what) => {
                    const o = Talk.open(id);
                    try {
                        await t.waitUntil(() => {
                            if (!Talk.isOpen() || !Talk.window().isOpen() || !Talk.keywordWindow().isOpen()) return false;
                            const d = Talk.window().drawnState(), v = Talk.keywordWindow().voiceDrawn();
                            return !!d && !d.portrait.pending && !(v && v.pending);
                        }, 5000, what);
                    } catch (e) { /* the check reports what it found */ }
                    await t.waitFrames(INPUT_LOCK + 2);
                    return o;
                };
                const ownOthers = cols.filter(u => u !== A && canSpeakFor(u, A));
                const pick = ownOthers.find(u => u !== partner && ["adult", "elder"].includes(stageOf(u))) || ownOthers[0] || null;

                // talk.player_portrait (V62): your portrait beside the keywords. The voice is the colonist you have selected;
                // with nothing selected another of yours (the ruler or the nearest grown person), never the person spoken to.
                {
                    const probe = () => {
                        const kw = Talk.keywordWindow();
                        const vd = kw ? kw.voiceDrawn() : null;
                        let alpha = 0;
                        if (vd && vd.drawn) alpha = kw.contents.getAlphaPixel(Math.floor(vd.rect.x + vd.rect.w / 2), Math.floor(vd.rect.y + vd.rect.h * 0.4));
                        const r0 = kw && kw.maxItems() > 0 ? kw.itemRect(0) : null;
                        const beside = !!vd && !!r0 && r0.x >= vd.rect.x + vd.rect.w && r0.y < vd.rect.y + vd.rect.h;
                        return { vd, alpha, r0, beside };
                    };
                    let selOk = true, selPart = "nobody else of yours on the map to select";
                    if (pick && cm && typeof cm.select === "function") {
                        cm.select(pick.id);
                        centerOn(A);
                        await openAndWait(A.id, "the talk with a colonist selected");
                        const cur = Talk.current();
                        const p = probe();
                        selOk = !!cur && cur.voice.unitId === pick.id && !!p.vd && p.vd.drawn && p.alpha > 0 && p.beside;
                        selPart = `${pick.name} (#${pick.id}) selected: voice ${cur ? `${cur.voice.name} (#${cur.voice.unitId}, ${cur.voice.from})` : "none"}, portrait ${p.vd ? `${p.vd.portrait.kind} ${p.vd.portrait.sheet || p.vd.portrait.name || ""} drawn ${p.vd.drawn}` : "not drawn"}, alpha ${p.alpha}, first keyword at x ${p.r0 ? p.r0.x : "-"} (the portrait ends at ${p.vd ? p.vd.rect.x + p.vd.rect.w : "-"})`;
                        t.screenshot("player_portrait");
                        Talk.closeNow();
                        if (typeof cm.deselect === "function") cm.deselect();
                    }
                    await openAndWait(A.id, "the talk with nothing selected");
                    const cur2 = Talk.current();
                    const p2 = probe();
                    const vu = cur2 && cur2.voice.unitId !== null ? unitById(cur2.voice.unitId) : null;
                    const whoOk = vu ? vu.id !== A.id && isOwn(vu) : (!ownOthers.length && !!cur2 && cur2.voice.from === "emblem");
                    const noSelOk = !!cur2 && whoOk && !!p2.vd && p2.vd.drawn && p2.alpha > 0 && p2.beside;
                    Talk.closeNow();
                    restoreSel();
                    t.check("player_portrait", selOk && noSelOk, `${selPart}; nothing selected: voice ${cur2 ? `${cur2.voice.name || "-"} (#${cur2.voice.unitId}, ${cur2.voice.from})` : "none"}, `
                        + `portrait ${p2.vd ? `${p2.vd.portrait.kind} drawn ${p2.vd.drawn}` : "not drawn"}, alpha ${p2.alpha}, keywords beside it ${p2.beside}`);
                }

                // talk.pages_not_cut (V62): a long line is shown a page at a time with every word kept; a mouse click turns the
                // page; the keywords wait (inactive, dimmed) until the last page.
                {
                    const hadT = Object.prototype.hasOwnProperty.call(A.data, "thoughts"), oldT = A.data.thoughts;
                    const longThought = `TEST_ a long thought, ${Array.from({ length: 70 }, (_, i) => `word${i + 1}`).join(" ")}.`;
                    let ok = false, detail = "";
                    try {
                        A.data.thoughts = [{ text: longThought, strength: 0 }].concat(Array.isArray(oldT) ? oldT : []);
                        centerOn(A);
                        await openAndWait(A.id, "the talk for the long line");
                        const full = Talk.ask("mood") || "";
                        await t.waitFrames(INPUT_LOCK + 2);
                        const cur = Talk.current();
                        const win = Talk.window(), kw = Talk.keywordWindow();
                        const d1 = win ? win.drawnState() : null;
                        let moreInk = 0;
                        if (d1 && d1.moreRect) {
                            for (let y = d1.moreRect.y; y < d1.moreRect.y + d1.moreRect.h; y++) {
                                for (let x = d1.moreRect.x; x < d1.moreRect.x + d1.moreRect.w; x++) if (win.contents.getAlphaPixel(x, y) > 0) moreInk++;
                            }
                        }
                        const waited = !!kw && !kw.active && kw.isWaiting();
                        t.screenshot("pages");
                        const seen = d1 ? [d1.lines.slice()] : [];
                        // A real click on the person's window: the release TouchInput reads on its next update.
                        const px = TouchInput._x, py = TouchInput._y;
                        TouchInput._x = Math.round(win.x + win.width / 2);
                        TouchInput._y = Math.round(win.y + win.height / 2);
                        TouchInput._moved = false;
                        TouchInput._newState.released = true;
                        await t.waitFrames(2);
                        TouchInput._x = px;
                        TouchInput._y = py;
                        const afterClick = Talk.current();
                        const clicked = !!afterClick && afterClick.page === 2;
                        if (clicked && afterClick.showing === "speaker") seen.push(win.drawnState().lines.slice());
                        let guard = 0;
                        while (Talk.pagesLeft() > 0 && guard++ < 30) {
                            Talk.next();
                            if (Talk.current().showing === "speaker") seen.push(win.drawnState().lines.slice());
                        }
                        await t.waitFrames(2);
                        const dLast = win.drawnState();
                        const norm = s => String(s).split(/\s+/).filter(Boolean).join(" ");
                        const joined = norm(seen.map(l => l.join(" ")).join(" "));
                        const want = norm(full);
                        const perPage = win.linesPerPage();
                        const fullPages = seen.slice(0, -1).every(l => l.length === perPage);
                        const activeAfter = !!kw && kw.active && !kw.isWaiting() && !dLast.more;
                        ok = full.length > 0 && !!cur && cur.pages >= 2 && !!d1 && d1.more && moreInk > 0 && waited && clicked && joined === want && !joined.includes("…") && fullPages && activeAfter;
                        detail = `mood line of ${want.split(" ").length} words in ${cur ? cur.pages : 0} page(s) of ${perPage} lines; page 1 shows ${d1 ? d1.lines.length : 0} lines, "more" mark ${d1 && d1.more ? `drawn (${moreInk} inked px)` : "absent"}; `
                            + `keywords waiting ${waited}; a click turned to page 2 ${clicked}; pages seen ${seen.length}, words shown ${joined ? joined.split(" ").length : 0} of ${want ? want.split(" ").length : 0}`
                            + `${joined === want ? " (all, in order)" : ` (MISMATCH; page 1 ends "${seen[0] && seen[0].length ? seen[0][seen[0].length - 1] : ""}")`}; keywords active after the last page ${activeAfter}`;
                        Talk.closeNow();
                    } finally {
                        if (hadT) A.data.thoughts = oldT;
                        else delete A.data.thoughts;
                    }
                    t.check("pages_not_cut", ok, detail);
                }

                // talk.companion_chimes (V62): one of yours standing near the person chimes in with their own portrait and line
                // when the line names them; the same question about one of yours out of range gets nothing from them.
                {
                    const hadP = Object.prototype.hasOwnProperty.call(A.data, "partner"), oldP = A.data.partner;
                    const range = chimeConf().range;
                    let ok = false, detail = "";
                    try {
                        const mk = (name, dx, dy) => spawn(name, dx, dy, { kind: "person", faction: A.data.faction, species: A.data.species,
                            gender: A.data.gender === "male" ? "female" : "male", age: 31, ai: null }, A.image.characterName);
                        const near = mk("TEST_companion", 1, 1);
                        const far = mk("TEST_faraway", range + 5, 0);
                        await t.waitUntil(() => W.eventOf(near.id) && W.eventOf(far.id), 3000, "the companions' events");
                        await t.waitFrames(2);
                        const dNear = cellDist(near, A), dFar = cellDist(far, A);
                        if (pick && cm && typeof cm.select === "function") cm.select(pick.id); // so neither of them is your voice
                        A.data.partner = near.id;
                        centerOn(A);
                        await openAndWait(A.id, "the talk with a companion near");
                        const line = Talk.ask(K.family) || "";
                        const cur = Talk.current();
                        const ch = cur ? cur.chime : null;
                        const namedIds = (lineFor(A, "family", 0).adds || []).filter(a => a.topic === "person").map(a => a.ref);
                        const chU = ch ? unitById(ch.unitId) : null;
                        const chOk = !!chU && namedIds.includes(chU.id) && cellDist(chU, A) <= range && chU.id !== (cur.voice.unitId) && fromTemplates(ch.text, T().chime && T().chime.named);
                        const pagesBefore = cur ? cur.pagesLeft : 0;
                        let guard = 0;
                        while (Talk.pagesLeft() > 0 && guard++ < 10) Talk.next();
                        const cw = Talk.companionWindow();
                        try {
                            await t.waitUntil(() => !!cw && cw.isOpen() && !!cw.drawnState() && !cw.drawnState().portrait.pending, 3000, "the companion's window");
                        } catch (e) { /* reported below */ }
                        const cd = cw ? cw.drawnState() : null;
                        let alpha = 0;
                        if (cd) alpha = cw.contents.getAlphaPixel(Math.floor(cd.portraitRect.x + cd.portraitRect.w / 2), Math.floor(cd.portraitRect.y + cd.portraitRect.h * 0.4));
                        const norm = s => String(s).split(/\s+/).filter(Boolean).join(" ");
                        const shown = cd ? norm(cd.lines.join(" ")) : "";
                        const winOk = !!cd && inLayer(cw) && cw.isOpen() && !!chU && cd.title === chU.name && cd.unitId === chU.id && alpha > 0 && shown === norm(ch ? ch.text : "-") && pagesBefore >= 1;
                        await t.waitFrames(3);
                        t.screenshot("companion");
                        A.data.partner = far.id;
                        const farChime = Talk.chimeFor(A, "family", 0, lineFor(A, "family", 0).adds, cur ? cur.voice.unitId : null);
                        const farOk = !farChime || farChime.unitId !== far.id;
                        Talk.closeNow();
                        ok = dNear <= range && dFar > range && chOk && winOk && farOk;
                        detail = `range ${range}; ${near.name} ${dNear} cells from ${A.name}, ${far.name} ${dFar}; voice ${cur ? `${cur.voice.name} (${cur.voice.from})` : "-"}; family: "${line}"; `
                            + `chime ${ch ? `${ch.name} (#${ch.unitId}, ${ch.variants.join("/")}): "${ch.text}"` : "none"} (named in the line: [${namedIds.join(", ")}]); `
                            + `companion window ${cd ? `open ${cw.isOpen()}, title "${cd.title}", portrait ${cd.portrait.kind} alpha ${alpha}, shows "${shown}"` : "not drawn"}, pages after the line ${pagesBefore}; `
                            + `partner ${far.name} out of range: ${farChime ? `chime from ${farChime.name}: "${farChime.text}"` : "no chime"}`;
                    } finally {
                        if (hadP) A.data.partner = oldP;
                        else delete A.data.partner;
                        restoreSel();
                    }
                    t.check("companion_chimes", ok, detail);
                }
            } finally {
                try { if (Talk.isOpen()) Talk.closeNow(); } catch (e) { /* cleanup */ }
                for (const u of fx.units) if (W.unit(u.id)) W.removeUnit(u.id);
                for (const [id, v] of fx.relations) F.setRelation("player", id, v);
                if (fx.met) for (const [id, met] of fx.met) { const f = F.get(id); if (f) f.met = met; }
                if (fx.partner) { if (fx.partner.had) fx.partner.unit.data.partner = fx.partner.old; else delete fx.partner.unit.data.partner; }
                if (fx.rank) { if (fx.rank.had) fx.rank.unit.data.rank = fx.rank.old; else delete fx.rank.unit.data.rank; }
                if (fx.pausedByTest && Tm && Tm.paused) Tm.resume();
            }
            await t.waitFrames(10);
            const errs = t.errorsSoFar().slice(errors0);
            t.check("no_errors", errs.length === 0, errs.length ? `${errs.length} error(s), first: ${errs[0]}` : "no uncaught error during the suite");
        }, { isDefault: false });
    }
})();
