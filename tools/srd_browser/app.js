// tools/srd_browser/app.js - the SRD 5.1 catalogue browser page.
//
// Plain browser JS, no framework, no build step, offline. Loads catalog/catalogue_manifest.json
// (served by serve.js from game/data/srd51), then the category files it names, builds one
// search index with catalog_query.js and renders a sidebar (search, filters, results) and a
// detail pane (formatted view per kind, verbatim text, raw JSON).
//
// The renderers are exposed on window.SrdBrowser so selftest.js can run them headlessly under a
// minimal DOM shim; init() only runs when the page's elements exist.
(function (root) {
    "use strict";
    const Q = root.SrdCatalogQuery;
    const SERVE_CMD = "node tools/srd_browser/serve.js";
    const FIXTURE_CMD = "node tools/srd_browser/serve.js --catalog tools/srd_browser/fixture";
    const EN_DASH = "–", EM_DASH = "—", MINUS = "−";

    // ------------------------------------------------------------------ DOM helpers
    function append(el, children) {
        for (const c of children) {
            if (c == null || c === false) continue;
            if (Array.isArray(c)) append(el, c);
            else if (typeof c === "string" || typeof c === "number") el.appendChild(document.createTextNode(String(c)));
            else el.appendChild(c);
        }
    }
    function h(tag, attrs) {
        const el = document.createElement(tag);
        if (attrs) {
            for (const k of Object.keys(attrs)) {
                const v = attrs[k];
                if (v == null || v === false) continue;
                if (k === "class") el.className = v;
                else if (k === "text") el.textContent = String(v);
                else if (k === "hidden") el.hidden = !!v;
                else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
                else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
                else if (k === "dataset" && typeof v === "object") Object.assign(el.dataset, v);
                else el.setAttribute(k, String(v));
            }
        }
        append(el, Array.prototype.slice.call(arguments, 2));
        return el;
    }
    function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

    // ------------------------------------------------------------------ formatting helpers
    const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
    const isTable = v => isObj(v) && Array.isArray(v.columns) && Array.isArray(v.rows);
    const isEmpty = v => v == null || v === "" || (Array.isArray(v) && v.length === 0) || (isObj(v) && Object.keys(v).length === 0);
    const dash = () => EM_DASH;

    const ABILITY_LABELS = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };
    const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];
    const ABILITY_SHORT = { str: "Str", dex: "Dex", con: "Con", int: "Int", wis: "Wis", cha: "Cha" };

    function labelize(key) {
        if (ABILITY_SHORT[key]) return ABILITY_SHORT[key];
        const s = String(key).replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
        return s.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bAc\b/, "AC").replace(/\bHp\b/, "HP").replace(/\bXp\b/, "XP").replace(/\bId\b/, "ID");
    }
    function signed(n) {
        if (typeof n === "string") { const t = n.trim(); return /^[+\-−]/.test(t) ? t.replace(/^-/, MINUS) : (/^\d/.test(t) ? "+" + t : t); }
        if (typeof n !== "number" || !Number.isFinite(n)) return String(n);
        return n < 0 ? MINUS + Math.abs(n) : "+" + n;
    }
    function modOf(score) {
        const n = typeof score === "number" ? score : parseInt(score, 10);
        if (!Number.isFinite(n)) return null;
        return Math.floor((n - 10) / 2);
    }
    function ordinal(n) {
        const s = ["th", "st", "nd", "rd"], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    function num(n) { return typeof n === "number" ? n.toLocaleString("en-US") : String(n); }
    function fmtPages(source) {
        const p = source && source.pages;
        if (p == null) return "";
        if (typeof p === "number" || typeof p === "string") return "p. " + p;
        if (Array.isArray(p) && p.length) {
            const flat = p.flat ? p.flat(2) : [].concat.apply([], p);
            const nums = flat.filter(x => typeof x === "number");
            if (!nums.length) return "p. " + flat.join(", ");
            const lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums);
            return lo === hi ? "p. " + lo : "pp. " + lo + EN_DASH + hi;
        }
        return "";
    }
    function fmtCost(c) {
        if (c == null) return dash();
        if (typeof c !== "object") return String(c);
        if (c.amount == null) return dash();
        return num(c.amount) + (c.unit ? " " + c.unit : "");
    }
    function fmtWeight(w) {
        if (w == null) return dash();
        if (typeof w === "number") return w + " lb.";
        if (typeof w === "string") return w;
        if (w.lb != null) return w.lb + " lb.";
        return fmtAny(w);
    }
    function fmtList(v, sep) {
        if (v == null) return dash();
        if (Array.isArray(v)) return v.length ? v.map(x => (isObj(x) ? fmtAny(x) : String(x))).join(sep || ", ") : dash();
        if (isObj(v)) return fmtAny(v);
        return String(v);
    }
    function fmtAny(v) {
        if (v == null) return dash();
        if (typeof v === "boolean") return v ? "yes" : "no";
        if (typeof v !== "object") return String(v);
        if (Array.isArray(v)) return fmtList(v);
        return Object.keys(v).map(k => labelize(k) + ": " + fmtAny(v[k])).join("; ");
    }
    function fmtSpeed(s) {
        if (s == null) return dash();
        if (typeof s !== "object") return String(s);
        const parts = [];
        const hover = s.hover === true;
        for (const k of Object.keys(s)) {
            if (k === "hover") continue;
            const v = s[k];
            if (v == null || v === false) continue;
            const val = typeof v === "number" ? v + " ft." : String(v);
            parts.push(k === "walk" ? val : k + " " + val + (k === "fly" && hover ? " (hover)" : ""));
        }
        return parts.length ? parts.join(", ") : dash();
    }
    function fmtBonusMap(v) {
        if (v == null) return "";
        if (typeof v === "string") return v;
        if (Array.isArray(v)) return v.map(x => (isObj(x) ? (labelize(x.name || x.skill || x.ability || "") + " " + signed(x.value != null ? x.value : x.bonus)) : String(x))).join(", ");
        if (!isObj(v)) return String(v);
        return Object.keys(v).map(k => labelize(k) + " " + signed(v[k])).join(", ");
    }
    function fmtSenses(s) {
        if (s == null) return "";
        if (typeof s === "string") return s;
        if (Array.isArray(s)) return s.join(", ");
        if (!isObj(s)) return String(s);
        const parts = [];
        for (const k of Object.keys(s)) {
            if (k === "passivePerception") continue;
            const v = s[k];
            if (v == null || v === false) continue;
            parts.push(labelize(k).toLowerCase() + " " + (typeof v === "number" ? v + " ft." : String(v)));
        }
        if (s.passivePerception != null) parts.push("passive Perception " + s.passivePerception);
        return parts.join(", ");
    }
    function fmtChallenge(c) {
        if (c == null) return "";
        if (typeof c !== "object") return String(c);
        const r = c.rating != null ? String(c.rating) : "";
        return r + (c.xp != null ? " (" + num(c.xp) + " XP)" : "");
    }
    function fmtAC(ac) {
        if (ac == null) return dash();
        if (typeof ac !== "object") return String(ac);
        if (ac.value != null) return String(ac.value) + (ac.note ? " (" + ac.note + ")" : "");
        if (ac.base != null) {
            let s = String(ac.base);
            if (ac.dexModifier === "full") s += " + Dex modifier";
            else if (ac.dexModifier === "max2") s += " + Dex modifier (max 2)";
            if (ac.bonus) s = "+" + ac.bonus + " (" + s + ")";
            return s;
        }
        return fmtAny(ac);
    }
    function fmtDamage(d) {
        if (d == null) return dash();
        if (typeof d !== "object") return String(d);
        return [d.dice, d.type].filter(Boolean).join(" ") || dash();
    }
    function fmtProperties(p) {
        if (p == null) return dash();
        if (!Array.isArray(p)) return fmtAny(p);
        if (!p.length) return dash();
        return p.map(x => (isObj(x) ? (x.name || "") + (x.detail ? " (" + x.detail + ")" : "") : String(x))).join(", ");
    }
    function fmtComponents(c) {
        if (c == null) return dash();
        if (typeof c !== "object") return String(c);
        const parts = [];
        if (c.verbal) parts.push("V");
        if (c.somatic) parts.push("S");
        if (c.material) parts.push("M" + (c.materialDescription ? " (" + c.materialDescription + ")" : ""));
        return parts.length ? parts.join(", ") : dash();
    }
    function fmtAttunement(a) {
        if (a == null) return dash();
        if (typeof a !== "object") return String(a);
        if (!a.required) return "no";
        return "requires attunement" + (a.restriction ? " " + a.restriction : "");
    }

    // ------------------------------------------------------------------ generic renderers
    function paragraphs(text) {
        const s = text == null ? "" : String(text);
        return s.split(/\n\s*\n/).map(p => p.replace(/\s+$/, "")).filter(p => p.trim().length);
    }
    function renderParagraphs(text, cls) {
        return paragraphs(text).map(p => h("p", { class: cls || "pre" }, p));
    }
    function renderTable(t, caption) {
        const cols = Array.isArray(t.columns) ? t.columns : [];
        const rows = Array.isArray(t.rows) ? t.rows : [];
        const cap = caption || t.caption || t.title || null;
        const table = h("table", { class: "grid" },
            cap ? h("caption", null, cap) : null,
            cols.length ? h("thead", null, h("tr", null, cols.map(c => h("th", null, fmtAny(c))))) : null,
            h("tbody", null, rows.map(r => {
                const cells = Array.isArray(r) ? r : (isObj(r) ? (cols.length ? cols.map(c => r[c]) : Object.values(r)) : [r]);
                return h("tr", null, cells.map(c => h("td", null, fmtAny(c))));
            })));
        return h("div", { class: "table-wrap" }, table);
    }
    function isNamedList(v) {
        return Array.isArray(v) && v.length > 0 && v.every(x => isObj(x) && (typeof x.name === "string" || typeof x.title === "string"));
    }
    function renderNamedList(items) {
        return items.map(item => {
            const title = (item.name || item.title || "") + (item.level != null ? " (level " + item.level + ")" : "");
            const body = item.text != null ? item.text : (item.description != null ? item.description : (item.detail != null ? item.detail : null));
            const rest = {};
            for (const k of Object.keys(item)) if (["name", "title", "level", "text", "description", "detail"].indexOf(k) < 0) rest[k] = item[k];
            return h("div", { class: "named" },
                h("h5", { class: "sub2" }, title),
                body != null ? renderParagraphs(body) : null,
                Object.keys(rest).length ? renderStructured(rest, { nested: true }) : null);
        });
    }
    function renderValue(v, key) {
        if (v == null) return h("span", { class: "muted" }, dash());
        if (typeof v === "boolean") return v ? "yes" : "no";
        if (typeof v === "number") return num(v);
        if (typeof v === "string") return v.length > 160 || v.indexOf("\n") >= 0 ? h("div", null, renderParagraphs(v)) : v;
        if (isTable(v)) return renderTable(v, key ? labelize(key) : null);
        if (Array.isArray(v)) {
            if (!v.length) return h("span", { class: "muted" }, dash());
            if (v.every(x => typeof x !== "object")) {
                if (v.length <= 8 && v.every(x => String(x).length <= 40)) return v.map(String).join(", ");
                return h("ul", { class: "plain" }, v.map(x => h("li", null, String(x))));
            }
            if (v.every(isTable)) return h("div", null, v.map(t => renderTable(t)));
            if (isNamedList(v)) return h("div", null, renderNamedList(v));
            return h("div", null, v.map(x => (isObj(x) ? renderStructured(x, { nested: true }) : h("p", null, fmtAny(x)))));
        }
        if (isObj(v)) return renderStructured(v, { nested: true });
        return String(v);
    }
    /** Headed prose for any data object: scalars in a property table, then complex fields as sections. */
    function renderStructured(data, opts) {
        const o = opts || {};
        if (!isObj(data)) return h("p", null, fmtAny(data));
        const scalars = [], sections = [];
        for (const key of Object.keys(data)) {
            const v = data[key];
            if (key === "headingPath" && Array.isArray(v)) { sections.unshift(h("div", { class: "crumbs" }, v.map(x => h("span", null, String(x))))); continue; }
            const simple = v == null || typeof v !== "object" || (Array.isArray(v) && v.every(x => typeof x !== "object") && v.length <= 8 && v.every(x => String(x).length <= 40));
            if (simple && !(typeof v === "string" && (v.length > 160 || v.indexOf("\n") >= 0))) scalars.push([key, v]);
            else sections.push(h("div", { class: "field" }, h("h4", { class: "sub" }, labelize(key)), renderValue(v, key)));
        }
        return h("div", { class: o.nested ? "structured nested" : "structured" },
            scalars.length ? h("table", { class: "props" }, scalars.map(([k, v]) => h("tr", null, h("th", null, labelize(k)), h("td", null, renderValue(v, k))))) : null,
            sections);
    }
    function propsTable(rows) {
        return h("table", { class: "props" }, rows.filter(r => r && r[1] !== undefined).map(([k, v]) => h("tr", null, h("th", null, k), h("td", null, v))));
    }
    function leftover(data, used) {
        const rest = {};
        for (const k of Object.keys(data || {})) if (used.indexOf(k) < 0 && !isEmpty(data[k])) rest[k] = data[k];
        return Object.keys(rest).length ? h("div", { class: "leftover" }, renderStructured(rest)) : null;
    }

    // ------------------------------------------------------------------ kind renderers
    function sbLine(label, value) {
        if (value == null || value === "") return null;
        return h("p", { class: "sb-line" }, h("b", null, label + " "), value);
    }
    function sbEntries(list) {
        if (!Array.isArray(list)) return null;
        return list.map(a => h("p", { class: "entry" }, h("b", null, (a && a.name ? a.name : "") + ". "), a && a.text != null ? String(a.text) : ""));
    }
    function renderCreature(entry) {
        const d = entry.data || {};
        const sub = [d.size, d.type].filter(Boolean).join(" ") + (d.subtype ? " (" + d.subtype + ")" : "") + (d.alignment ? ", " + d.alignment : "");
        const ab = isObj(d.abilities) ? d.abilities : null;
        const abilityTable = ab ? h("table", { class: "abilities" },
            h("thead", null, h("tr", null, ABILITY_ORDER.map(k => h("th", null, ABILITY_LABELS[k])))),
            h("tbody", null, h("tr", null, ABILITY_ORDER.map(k => {
                const score = ab[k];
                const mod = modOf(score);
                return h("td", null, score == null ? dash() : String(score), mod == null ? null : [" ", h("small", null, "(" + signed(mod) + ")")]);
            })))) : null;
        const hp = d.hitPoints;
        const hpText = hp == null ? null : (typeof hp === "object" ? (hp.average != null ? String(hp.average) : "") + (hp.formula ? " (" + hp.formula + ")" : "") : String(hp));
        const leg = d.legendaryActions;
        const legOptions = isObj(leg) ? leg.options : (Array.isArray(leg) ? leg : null);
        const legIntro = isObj(leg) ? leg.intro : null;
        return h("div", { class: "statblock" },
            h("p", { class: "sb-sub" }, sub || dash()),
            h("hr", { class: "sb-rule" }),
            sbLine("Armor Class", fmtAC(d.armorClass)),
            sbLine("Hit Points", hpText),
            sbLine("Speed", fmtSpeed(d.speed)),
            h("hr", { class: "sb-rule" }),
            abilityTable,
            h("hr", { class: "sb-rule" }),
            sbLine("Saving Throws", isEmpty(d.savingThrows) ? null : fmtBonusMap(d.savingThrows)),
            sbLine("Skills", isEmpty(d.skills) ? null : fmtBonusMap(d.skills)),
            sbLine("Damage Vulnerabilities", isEmpty(d.damageVulnerabilities) ? null : fmtList(d.damageVulnerabilities)),
            sbLine("Damage Resistances", isEmpty(d.damageResistances) ? null : fmtList(d.damageResistances)),
            sbLine("Damage Immunities", isEmpty(d.damageImmunities) ? null : fmtList(d.damageImmunities)),
            sbLine("Condition Immunities", isEmpty(d.conditionImmunities) ? null : fmtList(d.conditionImmunities)),
            sbLine("Senses", isEmpty(d.senses) ? null : fmtSenses(d.senses)),
            sbLine("Languages", isEmpty(d.languages) ? null : fmtList(d.languages)),
            sbLine("Challenge", isEmpty(d.challenge) ? null : fmtChallenge(d.challenge)),
            h("hr", { class: "sb-rule" }),
            sbEntries(d.traits),
            isEmpty(d.actions) ? null : [h("h4", { class: "sub" }, "Actions"), sbEntries(d.actions)],
            isEmpty(d.reactions) ? null : [h("h4", { class: "sub" }, "Reactions"), sbEntries(d.reactions)],
            isEmpty(legOptions) && !legIntro ? null : [h("h4", { class: "sub" }, "Legendary Actions"), legIntro ? h("p", { class: "entry" }, legIntro) : null, sbEntries(legOptions)],
            leftover(d, ["size", "type", "subtype", "alignment", "armorClass", "hitPoints", "speed", "abilities", "savingThrows", "skills",
                "damageVulnerabilities", "damageResistances", "damageImmunities", "conditionImmunities", "senses", "languages", "challenge",
                "traits", "actions", "reactions", "legendaryActions"]));
    }
    function renderSpell(entry) {
        const d = entry.data || {};
        const lvl = typeof d.level === "number" ? d.level : parseInt(d.level, 10);
        const school = d.school ? String(d.school) : "";
        let line;
        if (Number.isFinite(lvl) && lvl === 0) line = (school ? school.charAt(0).toUpperCase() + school.slice(1) + " " : "") + "cantrip";
        else if (Number.isFinite(lvl)) line = ordinal(lvl) + "-level " + school;
        else line = school;
        if (d.ritual) line += " (ritual)";
        let duration = d.duration == null ? null : String(d.duration);
        if (d.concentration && duration && !/concentration/i.test(duration)) duration = "Concentration, " + duration;
        return h("div", null,
            h("div", { class: "spell-head" },
                h("p", { class: "school" }, line || dash()),
                sbLine("Casting Time:", d.castingTime),
                sbLine("Range:", d.range),
                sbLine("Components:", fmtComponents(d.components)),
                sbLine("Duration:", duration)),
            d.description != null ? renderParagraphs(d.description) : null,
            d.atHigherLevels ? h("p", { class: "pre" }, h("b", null, "At Higher Levels. "), String(d.atHigherLevels).replace(/^\s*At Higher Levels\.?\s*/i, "")) : null,   // the data text carries the label already; do not print it twice
            isEmpty(d.classes) ? null : h("p", null, h("b", null, "Classes: "), fmtList(d.classes)),
            leftover(d, ["level", "school", "ritual", "castingTime", "range", "components", "duration", "concentration", "description", "atHigherLevels", "classes"]));
    }
    function renderSpellList(entry) {
        const d = entry.data || {};
        const lists = Array.isArray(d.spells) ? d.spells : [];
        return h("div", null,
            propsTable([["Class", d.class != null ? String(d.class) : dash()]]),
            lists.length ? renderTable({
                columns: ["Level", "Spells"],
                rows: lists.map(l => [l.level === 0 ? "Cantrips" : (typeof l.level === "number" ? ordinal(l.level) : fmtAny(l.level)), Array.isArray(l.names) ? l.names.join(", ") : fmtAny(l.names)])
            }, "Spell list") : null,
            leftover(d, ["class", "spells"]));
    }
    function renderEquipment(entry) {
        const d = entry.data || {};
        const rows = [];
        const used = ["cost", "weight", "description"];
        if (entry.kind === "weapon") {
            rows.push(["Category", [d.weaponCategory, d.rangeType].filter(Boolean).join(" ") || dash()]);
            rows.push(["Cost", fmtCost(d.cost)], ["Damage", fmtDamage(d.damage)], ["Weight", fmtWeight(d.weight)], ["Properties", fmtProperties(d.properties)]);
            used.push("weaponCategory", "rangeType", "damage", "properties");
        } else if (entry.kind === "armor") {
            rows.push(["Category", d.armorCategory || dash()], ["Cost", fmtCost(d.cost)], ["Armor Class", fmtAC(d.ac)],
                ["Strength", d.strength == null ? dash() : "Str " + d.strength], ["Stealth", d.stealthDisadvantage ? "Disadvantage" : dash()], ["Weight", fmtWeight(d.weight)]);
            used.push("armorCategory", "ac", "strength", "stealthDisadvantage");
        } else {
            rows.push(["Group", d.group || dash()], ["Cost", fmtCost(d.cost)], ["Weight", fmtWeight(d.weight)]);
            used.push("group");
        }
        return h("div", null, propsTable(rows), d.description ? renderParagraphs(d.description) : null, leftover(d, used));
    }
    function renderMagicItem(entry) {
        const d = entry.data || {};
        return h("div", null,
            propsTable([["Type", [d.itemType, d.typeDetail ? "(" + d.typeDetail + ")" : ""].filter(Boolean).join(" ") || dash()],
                ["Rarity", d.rarity || dash()], ["Attunement", fmtAttunement(d.attunement)]]),
            d.description != null ? renderParagraphs(d.description) : null,
            Array.isArray(d.tables) && d.tables.length ? d.tables.map(t => (isTable(t) ? renderTable(t) : renderValue(t))) : null,
            leftover(d, ["itemType", "typeDetail", "rarity", "attunement", "description", "tables"]));
    }
    const KIND_RENDERERS = {
        "creature": renderCreature,
        "spell": renderSpell,
        "spell-list": renderSpellList,
        "weapon": renderEquipment, "armor": renderEquipment, "gear": renderEquipment, "tool": renderEquipment,
        "mount": renderEquipment, "vehicle": renderEquipment, "trade-good": renderEquipment,
        "magic-item": renderMagicItem
    };
    function renderKindView(entry) {
        const fn = KIND_RENDERERS[entry.kind] || (e => renderStructured(e.data || {}));
        try {
            return fn(entry);
        } catch (err) {
            return h("div", null,
                h("div", { class: "notes" }, "Formatted view failed (" + (err && err.message ? err.message : err) + "); showing the generic view."),
                renderStructured(entry.data || {}));
        }
    }

    // ------------------------------------------------------------------ detail pane
    function badge(kind, cls) { return h("span", { class: "badge " + cls + " " + String(kind || "").replace(/[^a-z0-9-]/gi, "") }, String(kind == null || kind === "" ? "?" : kind)); }
    function iconBox(icon) {
        const idx = icon && typeof icon.index === "number" ? icon.index : (icon && /^\d+$/.test(String(icon.index)) ? parseInt(icon.index, 10) : null);
        const off = Q.iconOffset(idx);
        if (!off) return h("div", { class: "icon-box missing", title: "no valid icon index" }, "no icon");
        const set = icon && icon.set && /^[A-Za-z0-9_-]+$/.test(String(icon.set)) ? String(icon.set) : "IconSet";
        const style = { backgroundPosition: "-" + off.x + "px -" + off.y + "px" };
        if (set !== "IconSet") style.backgroundImage = "url(\"img/system/" + set + ".png\")";
        return h("div", { class: "icon-box", title: set + " #" + idx }, h("span", { class: "icon", style, "aria-label": "placeholder icon " + idx }));
    }
    async function copyText(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
        } catch (e) { /* fall through to the textarea fallback */ }
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return !!ok;
        } catch (e) { return false; }
    }
    function citation(entry) {
        const s = entry.source || {};
        const parts = [];
        parts.push(h("span", null, s.document ? String(s.document) : "(no document)"));
        const pages = fmtPages(s);
        if (pages) parts.push(h("span", { class: "sep" }, "·"), h("span", { class: "mono" }, pages));
        if (s.section) parts.push(h("span", { class: "sep" }, "·"), h("span", null, String(s.section)));
        if (s.heading) parts.push(h("span", { class: "sep" }, "›"), h("span", null, String(s.heading)));
        return h("p", { class: "d-cite" }, parts);
    }
    function buildDetail(entry) {
        const id = entry.id == null ? "" : String(entry.id);
        const status = h("span", { class: "copy-status", "aria-live": "polite" });
        const copyBtn = h("button", {
            type: "button", class: "btn btn-small", onclick: async () => {
                const ok = await copyText(id);
                status.textContent = ok ? "Copied" : "Copy failed";
                status.className = "copy-status" + (ok ? "" : " fail");
                setTimeout(() => { status.textContent = ""; }, 1800);
            }
        }, "Copy Stable ID");
        const meta = [];
        if (entry.readiness === "verified" && (entry.verifiedBy || entry.verifiedAt)) meta.push("Verified by " + (entry.verifiedBy || "?") + (entry.verifiedAt ? " on " + entry.verifiedAt : ""));
        if (entry.adaptation && entry.adaptation.deusId) meta.push("Adapted as " + entry.adaptation.deusId);
        const notes = Array.isArray(entry.notes) ? entry.notes.filter(Boolean) : [];
        const dice = Array.isArray(entry.dice) ? entry.dice : [];
        return h("div", { class: "d-wrap" },
            h("div", { class: "d-head" },
                iconBox(entry.icon),
                h("div", null,
                    h("h2", { class: "d-title" }, entry.name == null ? "(unnamed)" : String(entry.name)),
                    h("div", { class: "d-badges" }, badge(entry.category, "category"), badge(entry.kind, "kind"), badge(entry.readiness, "readiness")),
                    h("div", { class: "d-id" }, h("code", null, id || "(no id)"), copyBtn, status))),
            citation(entry),
            meta.length ? h("p", { class: "d-meta" }, meta.join(" · ")) : null,
            notes.length ? h("div", { class: "notes" }, "Parser notes:", h("ul", null, notes.map(n => h("li", null, String(n))))) : null,
            h("div", { class: "section" }, h("h3", null, labelize(entry.kind || "entry")), renderKindView(entry)),
            h("div", { class: "section verbatim" }, h("h3", null, "Verbatim text"), entry.text ? renderParagraphs(entry.text) : h("p", { class: "muted" }, "(no text)")),
            dice.length ? h("div", { class: "section" }, h("h3", null, "Dice"), h("div", { class: "chips" }, dice.map(d => h("span", { class: "chip" }, String(d.text || ""), d.average != null ? [" ", h("small", null, "avg " + d.average)] : null)))) : null,
            h("div", { class: "section" }, h("details", { class: "raw" }, h("summary", null, "Raw JSON"), h("pre", null, JSON.stringify(entry, null, 2)))));
    }
    function buildResultRow(entry, i) {
        return h("li", { role: "option", id: "r-" + i, dataset: { i: String(i) }, "aria-selected": "false" },
            h("span", { class: "r-name", title: entry.name == null ? "" : String(entry.name) }, entry.name == null ? "(unnamed)" : String(entry.name)),
            h("span", { class: "r-badges" }, badge(entry.kind, "kind"), badge(entry.readiness, "readiness")),
            h("span", { class: "r-cite" }, fmtPages(entry.source)));
    }
    function buildCoverage(model) {
        const m = model.manifest || {};
        const md = isObj(m.metadata) ? m.metadata : m;
        const cov = Q.coverage(model.entries);
        const declared = Q.declaredCounts(m);
        const readinessCols = Q.READINESS.slice();
        for (const r of Object.keys(cov.totals.readiness)) if (readinessCols.indexOf(r) < 0) readinessCols.push(r || "(none)");
        const cats = model.files.map(f => f.category);
        for (const c of Object.keys(cov.byCategory)) if (cats.indexOf(c) < 0) cats.push(c);
        const label = c => { const k = Q.CATEGORIES.find(x => x.id === c); return k ? k.label : c || "(none)"; };
        const declaredCell = (loaded, dec) => {
            if (dec === undefined) return h("td", { class: "num muted" }, dash());
            return h("td", { class: "num " + (dec === loaded ? "ok" : "mismatch"), title: dec === loaded ? "matches loaded count" : "manifest declares " + dec + ", loaded " + loaded }, num(dec));
        };
        const kindChips = kinds => h("div", { class: "kindlist" }, Object.keys(kinds).map(k => h("span", { class: "badge kind" }, (k || "?") + " " + kinds[k])));
        const rows = cats.map(c => {
            const cc = cov.byCategory[c] || { entries: 0, kinds: {}, readiness: {} };
            const f = model.files.find(x => x.category === c);
            const dc = declared.byCategory[c] || {};
            return h("tr", null,
                h("td", null, label(c)),
                h("td", { class: "mono" }, f ? f.file : dash(), f && f.error ? h("span", { class: "mismatch" }, " (" + f.error + ")") : null),
                h("td", { class: "num" }, num(cc.entries)),
                declaredCell(cc.entries, dc.entries),
                h("td", null, kindChips(cc.kinds)),
                readinessCols.map(r => h("td", { class: "num" }, cc.readiness[r === "(none)" ? "" : r] ? num(cc.readiness[r === "(none)" ? "" : r]) : h("span", { class: "muted" }, "0"))));
        });
        const sourceLine = [];
        if (md.generator) sourceLine.push("generator " + md.generator);
        if (md.assembledBy) sourceLine.push("assembled by " + md.assembledBy);
        if (md.generatedAt) sourceLine.push("generated " + md.generatedAt);
        if (md.schemaVersion != null) sourceLine.push("schema v" + md.schemaVersion);
        if (md.dormant != null) sourceLine.push("dormant: " + md.dormant);
        if (md.source && md.source.file) sourceLine.push("source " + md.source.file + (md.source.sha256 ? " (" + String(md.source.sha256).slice(0, 12) + "…)" : ""));
        return h("div", null,
            h("h2", null, "Coverage"),
            h("p", { class: "muted" }, sourceLine.length ? sourceLine.join(" · ") : "The manifest carries no metadata."),
            h("p", { class: "muted" }, "Files named by " + model.filesSource + ": " + model.files.map(f => f.file).join(", ") + ". Counts below are of the entries actually loaded; “declared” is what the manifest states when it states anything."),
            h("div", { class: "table-wrap" }, h("table", { class: "grid" },
                h("thead", null, h("tr", null, h("th", null, "Category"), h("th", null, "File"), h("th", { class: "num" }, "Loaded"), h("th", { class: "num" }, "Declared"), h("th", null, "Kinds"), readinessCols.map(r => h("th", { class: "num" }, r)))),
                h("tbody", null, rows,
                    h("tr", null, h("th", null, "Total"), h("th", null), h("th", { class: "num" }, num(cov.totals.entries)),
                        declared.totals.entries === undefined ? h("th", { class: "num muted" }, dash()) : h("th", { class: "num " + (declared.totals.entries === cov.totals.entries ? "ok" : "mismatch") }, num(declared.totals.entries)),
                        h("th", null, kindChips(cov.totals.kinds)),
                        readinessCols.map(r => h("th", { class: "num" }, num(cov.totals.readiness[r === "(none)" ? "" : r] || 0))))))),
            model.loadErrors.length ? h("div", { class: "notes" }, "Files that did not load:", h("ul", null, model.loadErrors.map(e => h("li", null, e)))) : null,
            h("h4", { class: "sub" }, "License"),
            model.attribution ? h("p", null, model.attribution.text, " ", h("span", { class: "muted" }, "(from " + model.attribution.from + ")")) : h("p", { class: "mismatch" }, "No attribution string found in the manifest or the category files. CC-BY-4.0 requires it (coverage manifest section 1)."));
    }
    function buildLoadError(kind, detail) {
        const fromFile = typeof location !== "undefined" && location.protocol === "file:";
        return h("div", { class: "empty error" },
            h("h2", null, kind === "manifest" ? "Catalogue not available" : "Catalogue files missing"),
            fromFile ? h("p", null, "This page was opened from a file:// URL. Chromium does not let a page fetch local JSON that way, so the catalogue cannot load. Serve it instead:") : h("p", null, detail),
            h("pre", null, SERVE_CMD, "\n", "then open http://127.0.0.1:8765/"),
            h("p", null, "The catalogue is expected at ", h("code", null, "game/data/srd51/catalogue_manifest.json"), " (produced by ", h("code", null, "node tools/build_srd_catalog.js"), "). To look at the browser without it, serve the synthetic fixture:"),
            h("pre", null, FIXTURE_CMD),
            !fromFile && detail ? h("p", { class: "muted" }, "Detail: " + detail) : null);
    }

    // ------------------------------------------------------------------ page controller
    function init() {
        const els = {
            status: document.getElementById("status"), banner: document.getElementById("banner"),
            search: document.getElementById("search"), clearBtn: document.getElementById("clear-btn"),
            category: document.getElementById("f-category"), kind: document.getElementById("f-kind"), readiness: document.getElementById("f-readiness"),
            challenge: document.getElementById("f-challenge"), level: document.getElementById("f-level"),
            lChallenge: document.getElementById("l-challenge"), lLevel: document.getElementById("l-level"),
            count: document.getElementById("count"), results: document.getElementById("results"),
            detail: document.getElementById("detail"), coverage: document.getElementById("coverage"), coverageBtn: document.getElementById("coverage-btn"),
            attribution: document.getElementById("attribution"), footerMeta: document.getElementById("footer-meta")
        };
        const model = { manifest: null, files: [], filesSource: "", entries: [], index: null, results: [], active: -1, attribution: null, loadErrors: [], coverageOpen: false };
        let searchTimer = null;

        function setStatus(text, isError) { els.status.textContent = text; els.status.className = "status" + (isError ? " error" : ""); }
        function showBanner(children, isError) { clear(els.banner); append(els.banner, [children]); els.banner.className = "banner" + (isError ? " error" : ""); els.banner.hidden = false; }
        function option(value, label) { return h("option", { value }, label); }
        function fillSelect(sel, values, labelFn, keepValue, allLabel) {
            const current = keepValue ? sel.value : "";
            clear(sel);
            sel.appendChild(option("", allLabel || "All"));
            for (const v of values) sel.appendChild(option(v, labelFn(v)));
            sel.value = values.indexOf(current) >= 0 ? current : "";
        }
        function filters() {
            return {
                query: els.search.value, category: els.category.value, kind: els.kind.value, readiness: els.readiness.value,
                challenge: els.category.value === "creatures" ? els.challenge.value : "",
                spellLevel: els.category.value === "spells" ? els.level.value : ""
            };
        }
        function populateFilters() {
            const idx = model.index;
            const catLabel = c => { const k = Q.CATEGORIES.find(x => x.id === c); return (k ? k.label : c || "(none)"); };
            fillSelect(els.category, idx.categories, catLabel, true);
            updateDependentFilters();
            fillSelect(els.readiness, idx.readiness, r => r || "(none)", true);
            fillSelect(els.challenge, idx.challenges, c => "CR " + c, true, "Any CR");
            fillSelect(els.level, idx.spellLevels, l => (l === "0" ? "Cantrip" : ordinal(parseInt(l, 10)) + " level"), true, "Any level");
            for (const k of ["search", "category", "kind", "readiness"]) els[k].disabled = false;
        }
        function updateDependentFilters() {
            const idx = model.index;
            const cat = els.category.value;
            const kinds = cat ? (idx.kindsByCategory[cat] || []) : idx.kinds;
            const facet = Q.facets(cat ? idx.entries.filter(e => e.category === cat) : idx.entries);
            fillSelect(els.kind, kinds, k => (k || "(none)") + " (" + (facet.kinds[k] || 0) + ")", true);
            els.lChallenge.hidden = cat !== "creatures";
            els.lLevel.hidden = cat !== "spells";
        }
        function runSearch() {
            if (!model.index) return;
            const activeId = model.active >= 0 && model.results[model.active] ? model.results[model.active].id : null;
            model.results = Q.search(model.index, filters());
            renderResults();
            const keep = activeId == null ? -1 : model.results.findIndex(e => e.id === activeId);
            model.active = keep;
            if (keep >= 0) markActive(keep, false);
        }
        function renderResults() {
            clear(els.results);
            const total = model.index.entries.length;
            els.count.textContent = num(model.results.length) + " of " + num(total) + (total === 1 ? " entry" : " entries");
            if (!model.results.length) { els.results.appendChild(h("li", { class: "none", role: "presentation" }, "No entries match.")); return; }
            const frag = document.createDocumentFragment();
            model.results.forEach((e, i) => frag.appendChild(buildResultRow(e, i)));
            els.results.appendChild(frag);
        }
        function markActive(i, scroll) {
            const prev = els.results.querySelector("li.active");
            if (prev) { prev.classList.remove("active"); prev.setAttribute("aria-selected", "false"); }
            const li = document.getElementById("r-" + i);
            if (li) {
                li.classList.add("active");
                li.setAttribute("aria-selected", "true");
                els.results.setAttribute("aria-activedescendant", li.id);
                if (scroll && li.scrollIntoView) li.scrollIntoView({ block: "nearest" });
            }
        }
        function select(i, opts) {
            const o = opts || {};
            if (i < 0 || i >= model.results.length) return;
            model.active = i;
            markActive(i, o.scroll !== false);
            showDetail(model.results[i]);
            if (o.focus) els.results.focus();
        }
        function showDetail(entry) {
            setCoverage(false);
            clear(els.detail);
            els.detail.appendChild(buildDetail(entry));
            if (entry.id != null && typeof history !== "undefined" && history.replaceState) {
                try { history.replaceState(null, "", "#" + encodeURIComponent(String(entry.id))); } catch (e) { /* ignore */ }
            }
            if (els.detail.scrollIntoView && window.innerWidth <= 700) els.detail.scrollIntoView({ block: "start" });
        }
        function setCoverage(open) {
            model.coverageOpen = !!open;
            els.coverage.hidden = !model.coverageOpen;
            els.detail.hidden = model.coverageOpen;
            els.coverageBtn.setAttribute("aria-pressed", model.coverageOpen ? "true" : "false");
            if (model.coverageOpen) { clear(els.coverage); els.coverage.appendChild(buildCoverage(model)); }
        }
        function applyHash() {
            if (!model.index) return false;
            let id = "";
            try { id = decodeURIComponent((location.hash || "").slice(1)); } catch (e) { id = (location.hash || "").slice(1); }
            if (!id) return false;
            const found = Q.resolveId(model.index, id);
            if (!found.length) { setStatus("No entry with id " + id, true); return false; }
            let i = model.results.findIndex(e => e.id === found[0].id);
            if (i < 0) {
                els.search.value = ""; els.category.value = ""; updateDependentFilters(); els.kind.value = ""; els.readiness.value = ""; els.challenge.value = ""; els.level.value = "";
                runSearch();
                i = model.results.findIndex(e => e.id === found[0].id);
            }
            if (i >= 0) select(i, { scroll: true });
            return i >= 0;
        }
        function onResultsKey(ev) {
            const n = model.results.length;
            if (!n) return;
            let next = null;
            if (ev.key === "ArrowDown") next = Math.min(n - 1, model.active + 1);
            else if (ev.key === "ArrowUp") next = Math.max(0, model.active - 1);
            else if (ev.key === "Home") next = 0;
            else if (ev.key === "End") next = n - 1;
            else if (ev.key === "PageDown") next = Math.min(n - 1, model.active + 15);
            else if (ev.key === "PageUp") next = Math.max(0, model.active - 15);
            else if (ev.key === "Enter" || ev.key === " ") next = model.active < 0 ? 0 : model.active;
            else return;
            ev.preventDefault();
            select(next, { scroll: true });
        }

        // Events
        els.search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 40); });
        els.search.addEventListener("keydown", ev => {
            if (ev.key === "ArrowDown") { ev.preventDefault(); if (model.results.length) { select(model.active < 0 ? 0 : model.active, { scroll: true, focus: true }); } }
            else if (ev.key === "Escape") { els.search.value = ""; runSearch(); }
            else if (ev.key === "Enter") { clearTimeout(searchTimer); runSearch(); if (model.results.length) select(0, { scroll: true }); }
        });
        els.results.addEventListener("keydown", onResultsKey);
        els.results.addEventListener("click", ev => {
            let li = ev.target;
            while (li && li !== els.results && !(li.tagName === "LI" && li.dataset && li.dataset.i != null)) li = li.parentNode;
            if (li && li !== els.results) select(parseInt(li.dataset.i, 10), { scroll: false, focus: true });
        });
        els.category.addEventListener("change", () => { updateDependentFilters(); els.challenge.value = ""; els.level.value = ""; runSearch(); });
        for (const k of ["kind", "readiness", "challenge", "level"]) els[k].addEventListener("change", runSearch);
        els.clearBtn.addEventListener("click", () => {
            els.search.value = ""; els.category.value = ""; if (model.index) updateDependentFilters(); els.kind.value = ""; els.readiness.value = ""; els.challenge.value = ""; els.level.value = "";
            runSearch(); els.search.focus();
        });
        els.coverageBtn.addEventListener("click", () => setCoverage(!model.coverageOpen));
        document.addEventListener("keydown", ev => {
            if (ev.key === "/" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
                const t = ev.target, tag = t && t.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
                ev.preventDefault(); els.search.focus(); els.search.select();
            }
        });
        window.addEventListener("hashchange", applyHash);

        // Load
        async function fetchJson(url) {
            const r = await fetch(url, { cache: "no-store" });
            if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
            return r.json();
        }
        async function load() {
            if (location.protocol === "file:") {
                setStatus("Cannot load from file://", true);
                clear(els.detail); els.detail.appendChild(buildLoadError("manifest", "opened from file://"));
                return;
            }
            let manifest;
            try {
                manifest = await fetchJson("catalog/" + Q.MANIFEST_FILE);
            } catch (err) {
                setStatus("Catalogue not found", true);
                clear(els.detail); els.detail.appendChild(buildLoadError("manifest", (err && err.message) || String(err)));
                els.attribution.textContent = "Attribution not available: the catalogue did not load.";
                els.attribution.className = "attribution missing";
                return;
            }
            model.manifest = manifest;
            const discovered = Q.discoverFiles(manifest);
            model.filesSource = discovered.source;
            const loaded = [];
            const settled = await Promise.all(discovered.files.map(async f => {
                try {
                    const json = await fetchJson("catalog/" + f.file);
                    const entries = Array.isArray(json) ? json : (Array.isArray(json.entries) ? json.entries : null);
                    if (!entries) throw new Error("no entries[] in " + f.file);
                    for (const e of entries) if (e && typeof e === "object" && e.category == null) e.category = f.category;
                    loaded.push({ file: f.file, json });
                    return { category: f.category, file: f.file, entries, json };
                } catch (err) {
                    const msg = f.file + ": " + ((err && err.message) || String(err));
                    model.loadErrors.push(msg);
                    return { category: f.category, file: f.file, entries: [], error: (err && err.message) || String(err) };
                }
            }));
            model.files = settled.map(s => ({ category: s.category, file: s.file, error: s.error }));
            model.entries = [].concat.apply([], settled.map(s => s.entries));
            model.index = Q.buildIndex(model.entries);
            model.attribution = Q.attributionFrom(manifest, loaded);
            if (model.attribution) { els.attribution.textContent = model.attribution.text; els.attribution.className = "attribution"; }
            else { els.attribution.textContent = "No CC-BY-4.0 attribution string found in the manifest or category files (required; see docs/SRD5_1_COVERAGE_MANIFEST.md section 1)."; els.attribution.className = "attribution missing"; }
            const md = isObj(manifest.metadata) ? manifest.metadata : manifest;
            els.footerMeta.textContent = num(model.entries.length) + " entries from " + settled.filter(s => !s.error).length + " of " + settled.length + " files" +
                (md.generatedAt ? " · manifest generated " + md.generatedAt : "") + (discovered.source === "fallback" ? " · manifest named no files; default names used" : "") + (md.fixture ? " · SYNTHETIC FIXTURE" : "");
            if (model.loadErrors.length) {
                showBanner([h("span", null, model.loadErrors.length + " catalogue file(s) did not load. Run ", h("code", null, SERVE_CMD), " from the project root and check that ", h("code", null, "game/data/srd51/"), " holds the files the manifest names."),
                    h("ul", null, model.loadErrors.map(e => h("li", null, e)))], !model.entries.length);
            }
            if (!model.entries.length) {
                setStatus("No entries loaded", true);
                clear(els.detail); els.detail.appendChild(buildLoadError("files", model.loadErrors.join("; ")));
                return;
            }
            populateFilters();
            setStatus(num(model.entries.length) + " entries · " + model.index.kinds.length + " kinds" + (md.fixture ? " · fixture" : ""));
            runSearch();
            if (!applyHash()) els.search.focus();
        }
        load().catch(err => {
            setStatus("Failed: " + ((err && err.message) || err), true);
            clear(els.detail); els.detail.appendChild(buildLoadError("manifest", (err && err.message) || String(err)));
        });
    }

    root.SrdBrowser = {
        h, buildDetail, buildResultRow, buildCoverage, buildLoadError, renderKindView, renderStructured, renderTable,
        renderCreature, renderSpell, renderSpellList, renderEquipment, renderMagicItem,
        fmtPages, fmtSpeed, fmtBonusMap, fmtSenses, fmtChallenge, fmtAC, fmtCost, fmtWeight, fmtComponents, signed, modOf, ordinal, labelize, paragraphs
    };
    if (typeof document !== "undefined" && document.getElementById && document.getElementById("results") && document.getElementById("detail")) init();
})(typeof window !== "undefined" ? window : this);
