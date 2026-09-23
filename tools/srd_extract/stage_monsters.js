#!/usr/bin/env node
// tools/srd_extract/stage_monsters.js - SRD 5.1 creature stager (kind "creature", category "creatures").
//
// Reads the page cache written by extract_pages.js (tools/srd_extract/cache/) and writes
// tools/srd_extract/staging/staging_monsters.json in the staging shape of
// docs/SRD5_1_COVERAGE_MANIFEST.md section 6, with the creature data fields of section 7.
//
// Pages: Monsters (A to Z) 261-357, Appendix MM-A 366-394, Appendix MM-B 395-403 (from cache/sections.json).
//
// Structure comes from the layout pages (page_NNN.layout.txt), read column by column (left, then right),
// with a per-line repair of the column split: the shared splitLayoutColumns picks the gutter column, but
// individual left-column lines run a few characters past it and the right column occasionally starts two
// characters early, so each line is re-cut at the first run of spaces that is followed by text at or after
// the right column's margin. Paragraph breaks inside a column are taken from the reading-order pages
// (page_NNN.txt), whose line breaks follow the PDF's real vertical gaps; blank lines in the layout are not
// trustworthy because the other column's baselines leak into them.
//
// Ends with PASS/FAIL self-checks and exits 1 on any FAIL. No network, no engine globals.
"use strict";

const fs = require("fs");
const path = require("path");
const T = require("./lib/srd_text");
const S = require("./lib/srd_schema");

const CACHE = path.join(__dirname, "cache");
const STAGING_DIR = path.join(__dirname, "staging");
const OUT_FILE = path.join(STAGING_DIR, "staging_monsters.json");
const GENERATOR = "tools/srd_extract/stage_monsters.js";
const KIND = "creature";
const CATEGORY = "creatures";
const EXPECTED = 313;
const TOLERANCE = 5;
const SPOT_CHECK = ["Aboleth", "Adult Red Dragon", "Commoner", "Giant Rat", "Solar"];

// ---------------------------------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------------------------------
const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
const SIZE_LINE_RE = new RegExp("^(" + SIZES.join("|") + ") (swarm of (?:" + SIZES.join("|") + ") [a-z]+|[a-z]+)(?: \\(([^)]*)\\))?, (.+)$");
const STAT_KEYS = ["Armor Class", "Hit Points", "Speed", "Saving Throws", "Skills", "Damage Vulnerabilities", "Damage Resistances", "Damage Resistance", "Damage Immunities", "Condition Immunities", "Senses", "Languages", "Challenge"];
const STAT_KEY_RE = new RegExp("^(" + STAT_KEYS.join("|") + ")(?:\\s+(.*))?$");
const ABILITY_NAMES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ABILITY_HEADER_RE = /^(?:(?:STR|DEX|CON|INT|WIS|CHA)\s*)+$/;
const ABILITY_HEADER_TAIL_RE = /\s{2,}((?:(?:STR|DEX|CON|INT|WIS|CHA)\s*)+)$/;
const SCORE_TOKEN_RE = /(\d+)\s*\(([+-]\s*\d+)\)/g;
const SCORES_ONLY_RE = /^(?:\s*\d+\s*\([+-]\s*\d+\)\s*)+$/;
const SECTION_HEADING_RE = /^(Actions|Reactions|Legendary Actions)$/;
const LETTER_HEADING_RE = /^Monsters \(([A-Z])\)$/;
const VARIANT_HEADING_RE = /^Variant: (.+)$/;
const CHALLENGE_RE = /^(\d+(?:\/\d+)?) \(([\d,]+) XP\)$/;
const CONNECTORS = new Set(["of", "the", "and", "or", "a", "an", "to", "in", "with", "from", "by", "for", "on", "at"]);
const NAME_WORD = "[A-Z][A-Za-z’'\\-]*";
const TRAIT_NAME_RE = new RegExp("^((?:" + NAME_WORD + ")(?: (?:" + NAME_WORD + "|" + Array.from(CONNECTORS).join("|") + "))*(?: \\([^)]*\\))?)\\.(?:\\s+(.*))?$");
const NOT_TRAIT_RE = /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Hit|Melee|Ranged|Large|Medium|Small|Huge|Tiny|Gargantuan|Common|Draconic|Sylvan|Elvish|Giant|Undercommon|Abyssal|Infernal|Celestial)( \([^)]*\))?$/;
const SPELL_LIST_LINE_RE = /^(At will:|\d+\/day(?: each)?:|Cantrips \(at will\):|\d+(?:st|nd|rd|th) level \(\d+ slots?\):|\*)/;
const PLURALS = { fungi: "fungus", mummies: "mummy", sphinxes: "sphinx", genies: "genie", oozes: "ooze", zombies: "zombie", vampires: "vampire", hags: "hag", nagas: "naga", mephits: "mephit", golems: "golem", giants: "giant", ghouls: "ghoul", skeletons: "skeleton", lycanthropes: "lycanthrope", angels: "angel", demons: "demon", devils: "devil", dinosaurs: "dinosaur", dragons: "dragon", elementals: "elemental", objects: "object", animals: "animal", swarms: "swarm" };
const DAMAGE_TYPES = "acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder";

// ---------------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------------
const pad3 = n => String(n).padStart(3, "0");
const squash = s => String(s).replace(/\s+/g, " ").trim();
const plain = s => T.toPlain(String(s)).toLowerCase();
const readCache = name => fs.readFileSync(path.join(CACHE, name), "utf8");
const isCap = s => /^[A-Z“"(]/.test(s);
const endsSentence = s => /[.!?:”")]$/.test(s.trim());
const uniq = arr => Array.from(new Set(arr));

function singularStem(heading) {
    // "Dragons, Chromatic" -> "dragon"; "Animated Objects" -> "animated object"; "Half-Dragon Template" -> "half-dragon template"
    let h = plain(heading).replace(/,.*$/, "").trim();
    const words = h.split(/\s+/);
    const last = words[words.length - 1];
    if (PLURALS[last]) words[words.length - 1] = PLURALS[last];
    else if (/ies$/.test(last)) words[words.length - 1] = last.replace(/ies$/, "y");
    else if (/[^s]s$/.test(last) && !/ss$/.test(last)) words[words.length - 1] = last.replace(/s$/, "");
    return words.join(" ");
}
function stemTokens(stem) {
    return stem.split(/[\s\-]+/).filter(w => w.length >= 4 && w !== "template" && !CONNECTORS.has(w));
}
function isTitleCase(s) {
    const words = s.replace(/[,:]/g, "").split(/\s+/);
    return words.every((w, i) => /^[A-Z][A-Za-z’'\-]*$/.test(w) || (i > 0 && CONNECTORS.has(w)));
}

// ---------------------------------------------------------------------------------------------------
// Page geometry and the line stream
// ---------------------------------------------------------------------------------------------------
function pageGeometry(lines, base, prevGeom) {
    if (base.gutter !== null) {
        const starts = new Map();
        for (const l of lines) {
            if (l.length <= base.gutter) continue;
            const m = /\S/.exec(l.slice(base.gutter));
            if (!m) continue;
            const i0 = base.gutter + m.index;
            starts.set(i0, (starts.get(i0) || 0) + 1);
        }
        let rm = null, best = 0;
        for (const [k, v] of starts) if (v > best) { best = v; rm = k; }
        if (rm === null) rm = base.rightStart;
        return { gutter: base.gutter, rm };
    }
    // The shared splitter saw too few long lines to find a gutter. If text sits at the previous page's right
    // margin, the page still has two columns and the previous geometry applies.
    if (prevGeom && lines.some(l => l.length > prevGeom.rm && l.slice(prevGeom.rm - 3, prevGeom.rm).trim() === "" && l[prevGeom.rm] !== " " && l.slice(0, prevGeom.rm - 3).trim() !== "")) return prevGeom;
    if (prevGeom && lines.some(l => /^\s{40,}\S/.test(l))) return prevGeom;
    return null;
}

/**
 * Cut one layout line into [left, right]. The right column normally starts at the page's right margin `rm`
 * (text at rm - 3 or later is cut without further checks). pdftotext -layout also places some right-column
 * lines up to eight characters earlier; a gap in that zone is treated as the column boundary only when the
 * reading-order page (`ro`, whitespace-squashed) does not contain the two fragments joined, i.e. when the
 * text does not flow through the gap.
 */
function cutLine(l, geom, ro) {
    const rtrim = s => s.replace(/\s+$/, "");
    if (!geom || geom.rm === null) return [rtrim(l), ""];
    const rm = geom.rm;
    const thr = Math.max(geom.gutter - 1, rm - 8);
    const re = /\s{2,}(?=\S)/g;
    let m;
    while ((m = re.exec(l)) !== null) {
        const t = m.index + m[0].length;
        if (t < thr) continue;
        const A = rtrim(l.slice(0, m.index));
        const B = l.slice(t);
        const right = rtrim(l.slice(Math.min(t, rm)));
        if (A.trim() === "") return ["", right];
        if (t >= rm - 3) return [A, right];
        const probe = squash(A.slice(-24) + " " + B.slice(0, 24));
        if (ro && ro.includes(probe)) continue; // same column: the text flows through this gap
        return [A, right];
    }
    return [rtrim(l), ""];
}

/** Build the ordered line stream for one page: left column lines then right column lines. */
function pageStream(page, prevGeom, warnings) {
    const layout = readCache("page_" + pad3(page) + ".layout.txt");
    const lines = layout.split("\n");
    const base = T.splitLayoutColumns(layout);
    const geom = pageGeometry(lines, base, prevGeom);
    const ro = squash(readCache("page_" + pad3(page) + ".txt"));
    const left = [], right = [];
    for (const l of lines) {
        const [a, b] = cutLine(l, geom, ro);
        left.push(a);
        right.push(b);
    }
    const out = [];
    const pushCol = (arr, col) => {
        let top = true;
        for (let i = 0; i < arr.length; i++) {
            const raw = arr[i];
            const text = raw.trim();
            const indent = raw.length - raw.replace(/^\s+/, "").length;
            const blank = text === "";
            out.push({ page, col, idx: i, raw, text, indent, blank, colTop: !blank && top });
            if (!blank) top = false;
        }
    };
    pushCol(left, 0);
    if (geom) pushCol(right, 1);
    return { stream: out, geom: geom || prevGeom };
}

/** Reading-order oracle: does a layout line start / end a line of the reading-order page? */
function readingOracle(page) {
    const txt = readCache("page_" + pad3(page) + ".txt");
    const lines = txt.split("\n").map(squash).filter(Boolean);
    const key = s => squash(s);
    return {
        startsLine(text) {
            const k = key(text);
            const probe = k.length > 24 ? k.slice(0, 24) : k;
            return lines.some(l => l.startsWith(probe) && (k.length > 24 || l.length === k.length || l[k.length] === " "));
        },
        endsLine(text) {
            const k = key(text);
            const probe = k.length > 24 ? k.slice(-24) : k;
            return lines.some(l => l.endsWith(probe) && (k.length > 24 || l.length === k.length || l[l.length - k.length - 1] === " "));
        },
        exactLine(text) { return lines.includes(key(text)); }
    };
}

// ---------------------------------------------------------------------------------------------------
// Stream scanning: name lines, headings
// ---------------------------------------------------------------------------------------------------
function nextNonBlank(stream, i, sameCol) {
    const col = stream[i] && stream[i].col, page = stream[i] && stream[i].page;
    for (let j = i + 1; j < stream.length; j++) {
        if (sameCol && (stream[j].col !== col || stream[j].page !== page)) return -1;
        if (!stream[j].blank) return j;
    }
    return -1;
}

/** Strip a displaced ability header tail ("Hill Giant            WIS    CHA") from a name line. */
function splitNameTail(text) {
    const m = ABILITY_HEADER_TAIL_RE.exec(text);
    if (!m) return { name: text, displacedHeader: [] };
    return { name: text.slice(0, m.index).trim(), displacedHeader: m[1].trim().split(/\s+/) };
}

const NAME_RE = /^[A-Z][A-Za-z’'\-\/,() ]*$/;

/**
 * Is stream[i] the name line of a stat block? The next non-blank line in the same column must be a size line
 * (optionally after one line of displaced ability scores), and "Armor Class" must follow within three lines.
 */
function nameLineAt(stream, i) {
    const L = stream[i];
    if (L.blank || L.indent > 4) return null;
    const { name, displacedHeader } = splitNameTail(L.text);
    if (!NAME_RE.test(name) || name.split(/\s+/).length > 5 || STAT_KEY_RE.test(name) || SECTION_HEADING_RE.test(name)) return null;
    if (SIZE_LINE_RE.test(name) || LETTER_HEADING_RE.test(name)) return null;
    let j = nextNonBlank(stream, i, true);
    if (j < 0) return null;
    let displacedScores = null;
    if (SCORES_ONLY_RE.test(stream[j].text)) {
        displacedScores = stream[j].text;
        j = nextNonBlank(stream, j, true);
        if (j < 0) return null;
    }
    const sm = SIZE_LINE_RE.exec(stream[j].text);
    if (!sm) return null;
    let k = nextNonBlank(stream, j, true);
    if (k < 0) return null;
    let sizeCont = null;
    if (!/^Armor Class/.test(stream[k].text)) {
        // the alignment may wrap onto a second short line ("any non-lawful" / "alignment")
        if (/^[a-z][a-z ]{0,30}$/.test(stream[k].text) && stream[k].text.split(/\s+/).length <= 3) {
            sizeCont = k;
            k = nextNonBlank(stream, k, true);
            if (k < 0 || !/^Armor Class/.test(stream[k].text)) return null;
        } else return null;
    }
    return { name, displacedHeader, displacedScores, sizeIdx: j, sizeCont, acIdx: k };
}

// ---------------------------------------------------------------------------------------------------
// Field parsers
// ---------------------------------------------------------------------------------------------------
function parseArmorClass(s) {
    const m = /^(\d+)\s*(.*)$/.exec(squash(s));
    if (!m) return { value: null, note: s || null };
    let note = m[2].trim();
    if (/^\([^()]*\)$/.test(note)) note = note.slice(1, -1);
    return { value: parseInt(m[1], 10), note: note || null };
}
function parseHitPoints(s) {
    const m = /^(\d+)(?:\s*\(([^)]*)\))?\s*(.*)$/.exec(squash(s));
    if (!m) return { average: null, formula: null };
    const hp = { average: parseInt(m[1], 10), formula: m[2] ? squash(m[2]) : null };
    if (m[3]) hp.note = m[3];
    return hp;
}
function parseSpeed(s) {
    // "30 ft., fly 90 ft." -> { walk: 30, fly: 90 }; "0 ft., fly 50 ft. (hover)" -> hover: true;
    // "30 ft. (40 ft., climb 30 ft. in bear or hybrid form)" keeps the parenthetical as note, unparsed.
    const out = {};
    const notes = [];
    let rest = squash(s).replace(/\(([^)]*)\)/g, (m, inner) => { if (/^hover$/i.test(inner.trim())) return "(hover)"; notes.push(inner.trim()); return " "; });
    rest = squash(rest);
    const first = /^(\d+) ft\.?/.exec(rest);
    if (!first) return { walk: null, note: squash(s) || null };
    out.walk = parseInt(first[1], 10);
    rest = rest.slice(first[0].length);
    const re = /,?\s*(fly|swim|burrow|climb) (\d+) ft\.?(\s*\(hover\))?/g;
    let m;
    let last = 0;
    while ((m = re.exec(rest)) !== null) {
        out[m[1]] = parseInt(m[2], 10);
        if (m[3]) out.hover = true;
        if (m.index > last) { const gap = rest.slice(last, m.index).replace(/^[,\s]+|[,\s]+$/g, ""); if (gap) notes.push(gap); }
        last = m.index + m[0].length;
    }
    const tail = rest.slice(last).replace(/^[,\s]+|[,\s]+$/g, "");
    if (tail) notes.push(tail);
    if (notes.length) out.note = notes.join("; ");
    return out;
}
function parseBonusList(s) {
    // "Con +6, Int +8" / "History +12, Perception +10" -> { con: 6, ... } (skill keys camel-cased)
    const out = {};
    for (const part of squash(s).split(/,\s*/)) {
        const m = /^([A-Za-z][A-Za-z ]*?)\s*([+-]\d+)$/.exec(part.trim());
        if (!m) { out._unparsed = (out._unparsed || []).concat(part.trim()); continue; }
        const key = m[1].trim().split(/\s+/).map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
        out[key] = parseInt(m[2], 10);
    }
    return out;
}
function parseSemicolonList(s) { return squash(s).split(/;\s*/).map(x => x.trim()).filter(Boolean); }
function parseCommaList(s) { return squash(s).split(/,\s*/).map(x => x.trim()).filter(Boolean); }
function parseSenses(s) {
    const out = {};
    const other = [];
    for (const part of squash(s).split(/,\s*(?![^(]*\))/)) {
        const p = part.trim();
        let m;
        if ((m = /^(darkvision|blindsight|tremorsense|truesight) (\d+) ft\.?(?:\s*\(([^)]*)\))?$/.exec(p))) {
            out[m[1]] = parseInt(m[2], 10);
            if (m[3]) out[m[1] + "Note"] = m[3];
        } else if ((m = /^passive Perception (\d+)$/.exec(p))) {
            out.passivePerception = parseInt(m[1], 10);
        } else if (p) other.push(p);
    }
    if (other.length) out.other = other;
    if (out.passivePerception === undefined) out.passivePerception = null;
    return out;
}
function parseChallenge(s) {
    const m = CHALLENGE_RE.exec(squash(s));
    if (!m) return { rating: null, ratingText: squash(s) || null, xp: null };
    const [a, b] = m[1].split("/").map(Number);
    return { rating: b ? a / b : a, ratingText: m[1], xp: parseInt(m[2].replace(/,/g, ""), 10) };
}

/** Parse "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) bludgeoning damage plus ..." */
function parseAttack(text) {
    const t = squash(text);
    const head = /^(Melee or Ranged|Melee|Ranged) (Weapon|Spell) Attack:\s*([+-]\d+) to hit(?:\s*\(([^)]*)\))?,\s*(.*)$/s.exec(t);
    if (!head) return null;
    const attack = { type: head[1].toLowerCase(), attackKind: head[2].toLowerCase(), toHit: parseInt(head[3], 10), reach: null, range: null, target: null, hit: { average: null, dice: null, damageType: null }, extra: null };
    if (head[4]) attack.toHitNote = head[4];
    let rest = head[5];
    const hitSplit = /\.\s+Hit:\s*/.exec(rest);
    let pre = rest, post = "";
    if (hitSplit) { pre = rest.slice(0, hitSplit.index); post = rest.slice(hitSplit.index + hitSplit[0].length); }
    else attack.hitMissing = true;
    let m;
    if ((m = /reach (\d+) ft\./.exec(pre))) attack.reach = parseInt(m[1], 10);
    if ((m = /range (\d+)(?:\/(\d+))? ft\./.exec(pre))) attack.range = { normal: parseInt(m[1], 10), long: m[2] ? parseInt(m[2], 10) : null };
    attack.target = pre.replace(/reach \d+ ft\.,?\s*(?:or\s*)?/, "").replace(/range \d+(?:\/\d+)? ft\.,?\s*/, "").replace(/^[,\s]+|[,\s]+$/g, "") || null;
    if (post) {
        const dm = new RegExp("^(\\d+)(?:\\s*\\(([^)]*)\\))?\\s+((?:" + DAMAGE_TYPES + ")(?: or (?:" + DAMAGE_TYPES + "))?)\\s+damage").exec(post);
        if (dm) {
            attack.hit = { average: parseInt(dm[1], 10), dice: dm[2] ? squash(dm[2]) : null, damageType: dm[3] };
            const extra = post.slice(dm[0].length).replace(/^[\s.,;]+/, "").trim();
            attack.extra = extra || null;
        } else {
            attack.hit = { average: null, dice: null, damageType: null, text: post };
        }
    }
    return attack;
}

// ---------------------------------------------------------------------------------------------------
// Block parsing
// ---------------------------------------------------------------------------------------------------
function makeNote(entry, msg) { entry.notes.push(msg); }

/** Parse the stat header lines (size line .. Challenge line). `lines` are stream items. */
function parseHeader(items, nameInfo, entry, data) {
    const fields = []; // [{ key, value }]
    let cur = null;
    const abilityHeader = [];
    const scoreTokens = [];
    const textLines = [];
    // pdftotext occasionally merges a wrapped stat value with the next stat line using a single space
    // (page 327: "silvered weapons Senses passive Perception 12"); split such lines at the embedded key.
    const EMBEDDED_KEY_RE = /\s(?=(?:Saving Throws|Skills|Damage (?:Vulnerabilities|Resistances|Immunities)|Condition Immunities|Senses|Languages|Challenge)\s)/;
    const expanded = [];
    for (const it of items) {
        if (it.blank) { expanded.push(it); continue; }
        const parts = it.text.split(EMBEDDED_KEY_RE).map(p => p.trim()).filter(Boolean);
        if (parts.length > 1) {
            makeNote(entry, "stat line split at an embedded key on page " + it.page + ": " + JSON.stringify(it.text));
            for (const c of parts) expanded.push(Object.assign({}, it, { text: c }));
        } else expanded.push(it);
    }
    for (const it of expanded) {
        if (it.blank) continue;
        const text = it.text;
        if (ABILITY_HEADER_RE.test(text)) { abilityHeader.push(...text.split(/\s+/)); textLines.push({ kind: "abil", text }); cur = null; continue; }
        if (SCORES_ONLY_RE.test(text)) { scoreTokens.push(...Array.from(text.matchAll(SCORE_TOKEN_RE)).map(m => ({ score: parseInt(m[1], 10), mod: parseInt(m[2].replace(/\s+/g, ""), 10) }))); textLines.push({ kind: "abil", text }); cur = null; continue; }
        const km = STAT_KEY_RE.exec(text);
        if (km) { cur = { key: km[1], value: km[2] || "" }; fields.push(cur); textLines.push({ kind: "stat", text }); continue; }
        if (cur) { cur.value = (cur.value + " " + text).trim(); textLines[textLines.length - 1].text += " " + text; continue; }
        makeNote(entry, "header line not understood on page " + it.page + ": " + JSON.stringify(text));
        textLines.push({ kind: "stat", text });
    }
    // abilities: main header + displaced header, main scores + displaced scores
    const header = abilityHeader.concat(nameInfo.displacedHeader || []);
    const scores = scoreTokens.slice();
    if (nameInfo.displacedScores) {
        scores.push(...Array.from(nameInfo.displacedScores.matchAll(SCORE_TOKEN_RE)).map(m => ({ score: parseInt(m[1], 10), mod: parseInt(m[2].replace(/\s+/g, ""), 10) })));
        makeNote(entry, "ability scores for " + (nameInfo.displacedHeader || []).join("/") + " were printed on a displaced line next to the name (page " + entry.source.pages[0] + "); recombined from the layout");
    }
    let abilities = null, modifiers = null;
    if (scores.length === 6) {
        const order = header.length === 6 && ABILITY_NAMES.every(a => header.includes(a)) ? header : ABILITY_NAMES;
        if (header.length !== 6) makeNote(entry, "ability header has " + header.length + " labels; scores assigned in STR..CHA order");
        abilities = {}; modifiers = {};
        order.forEach((a, i) => { abilities[a.toLowerCase()] = scores[i].score; modifiers[a.toLowerCase()] = scores[i].mod; });
        abilities = { str: abilities.str, dex: abilities.dex, con: abilities.con, int: abilities.int, wis: abilities.wis, cha: abilities.cha };
        modifiers = { str: modifiers.str, dex: modifiers.dex, con: modifiers.con, int: modifiers.int, wis: modifiers.wis, cha: modifiers.cha };
    } else {
        makeNote(entry, "abilities: expected 6 scores, found " + scores.length);
    }
    data.abilities = abilities;
    data.abilityModifiers = modifiers;
    const seen = new Set();
    for (const f of fields) {
        if (seen.has(f.key)) makeNote(entry, "duplicate stat line " + f.key);
        seen.add(f.key);
        const v = f.value;
        switch (f.key) {
            case "Armor Class": data.armorClass = parseArmorClass(v); break;
            case "Hit Points": data.hitPoints = parseHitPoints(v); break;
            case "Speed": data.speed = parseSpeed(v); break;
            case "Saving Throws": data.savingThrows = parseBonusList(v); break;
            case "Skills": data.skills = parseBonusList(v); break;
            case "Damage Vulnerabilities": data.damageVulnerabilities = parseSemicolonList(v); break;
            case "Damage Resistances": data.damageResistances = parseSemicolonList(v); break;
            case "Damage Resistance": data.damageResistances = parseSemicolonList(v); makeNote(entry, "stat line printed as 'Damage Resistance' (singular)"); break;
            case "Damage Immunities": data.damageImmunities = parseSemicolonList(v); break;
            case "Condition Immunities": data.conditionImmunities = parseCommaList(v); break;
            case "Senses": data.senses = parseSenses(v); break;
            case "Languages": data.languages = squash(v); break;
            case "Challenge": data.challenge = parseChallenge(v); break;
        }
    }
    for (const req of ["Armor Class", "Hit Points", "Speed", "Senses", "Languages", "Challenge"]) if (!seen.has(req)) makeNote(entry, "missing stat line " + req);
    // Text lines for the entry text: reconstruct the ability block in canonical order
    const out = [];
    const statText = textLines.filter(l => l.kind === "stat").map(l => squash(l.text));
    const abilText = abilities ? ["STR DEX CON INT WIS CHA", ABILITY_NAMES.map(a => abilities[a.toLowerCase()] + " (" + (modifiers[a.toLowerCase()] >= 0 ? "+" : "") + modifiers[a.toLowerCase()] + ")").join(" ")]
        : textLines.filter(l => l.kind === "abil").map(l => squash(l.text));
    const first = statText.filter(l => /^(Armor Class|Hit Points|Speed)\b/.test(l));
    const rest = statText.filter(l => !/^(Armor Class|Hit Points|Speed)\b/.test(l));
    out.push(first.join("\n"));
    out.push(abilText.join("\n"));
    if (rest.length) out.push(rest.join("\n"));
    return out;
}

/**
 * Parse the body of a stat block (everything after the Challenge line up to the block end):
 * traits, Actions, Reactions, Legendary Actions, then any trailing description prose.
 *
 * Paragraph rules (the layout's blank lines are not trusted, see the file header):
 * - "Name. text" at the column's base indent starts a trait/action/reaction; in Legendary Actions only
 *   base-indent lines start options (their continuations hang indented).
 * - An indented line that starts with a capital after a sentence-ending line, and whose next line is not
 *   indented, is a first-line-indented new paragraph (the SRD's style for later paragraphs of an entry).
 *   Any other indented line is a hanging-indent continuation (breath weapons, spell lists, legendary options).
 * - A base-indent line mid-column starts a new paragraph when the reading-order page breaks a line there and
 *   the previous layout line ends a sentence; such a paragraph after the entries is the trailing description.
 * - At the top of a column the reading order cannot tell; in the appendices a description start is accepted
 *   there only when the line follows a sentence end, does not open like a rule and names the creature.
 */
const RULES_OPENER_RE = /^(If|Hit:|The target|Each |While|On a|Until|Otherwise|Any |Whenever|In addition|Instead|A creature that|The creature|The DC|Creatures|At the|After|Before|When|Once|Unless|This|It |Its )/;
function mentionsCreature(text, name) {
    const first = plain(text).split(/(?<=[.!?])\s/)[0];
    const toks = plain(name).replace(/\(.*?\)/g, "").split(/[^a-z]+/).filter(w => w.length >= 4 && !CONNECTORS.has(w));
    return toks.some(t => first.includes(t));
}
function parseBody(items, entry, data, oracles, opts) {
    const isAppendix = !!(opts && opts.isAppendix);
    const sections = { traits: [], actions: [], reactions: [], legendary: null };
    let section = "traits";
    let container = null;        // current { name, paras: [ [lines...] ] }
    let descParas = null;        // paragraphs (arrays of line strings) once the description starts
    let legendaryIntro = null;
    let contMode = null;         // "list" while inside a spell list
    let lastNonBlank = null;
    const textOut = [];          // ordered text fragments for the entry text

    const newEntryObj = name => ({ name, paras: [[]] });
    const addLine = (obj, line, newPara, softBreak) => {
        if (newPara) obj.paras.push([]);
        const para = obj.paras[obj.paras.length - 1];
        if (softBreak && para.length) para.push("\n" + line);
        else para.push(line);
    };
    const joinPara = lines => {
        let s = "";
        for (const l of lines) {
            if (l.startsWith("\n")) { s += l; continue; }
            if (!s) { s = l; continue; }
            if (/[-\u2011\u2010]$/.test(s) && /^[a-z]/.test(l)) s += l; else s += " " + l;
        }
        return s;
    };
    const finishEntry = obj => ({ name: obj.name, text: obj.paras.filter(p => p.length).map(joinPara).join("\n\n") });
    const nextInCol = i => { for (let j = i + 1; j < items.length; j++) { if (items[j].page !== items[i].page || items[j].col !== items[i].col) return null; if (!items[j].blank) return items[j]; } return null; };

    for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        if (it.blank) continue;
        const text = it.text;
        const oracle = oracles(it.page);
        const isColTop = it.colTop;
        const nxt = nextInCol(idx);
        const nextIndented = !!(nxt && nxt.indent >= 1 && !SPELL_LIST_LINE_RE.test(nxt.text));
        const prevEnds = !!(lastNonBlank && endsSentence(lastNonBlank.text));
        const listLine = SPELL_LIST_LINE_RE.test(text) && it.indent <= 2;

        if (SECTION_HEADING_RE.test(text) && it.indent <= 2 && descParas === null) {
            section = text === "Actions" ? "actions" : text === "Reactions" ? "reactions" : "legendary";
            if (section === "legendary") { sections.legendary = { intro: null, options: [] }; legendaryIntro = { name: null, paras: [[]] }; container = legendaryIntro; }
            else container = null;
            contMode = null;
            textOut.push({ kind: "heading", text });
            lastNonBlank = it;
            continue;
        }
        const tm = descParas === null && !listLine ? TRAIT_NAME_RE.exec(text) : null;
        const looksNamed = !!(tm && !NOT_TRAIT_RE.test(tm[1]) && tm[1].split(/\s+/).length <= 8);
        if (looksNamed) {
            let startsEntry = false, subParagraph = false;
            if (section === "legendary") startsEntry = it.indent === 0;
            else if (it.indent === 0) startsEntry = true;
            else if (container && container.name && prevEnds && !nextIndented) subParagraph = true;
            if (subParagraph) {
                // e.g. the vampire's "Forbiddance." sub-items: a paragraph of the current trait, not a new trait
                addLine(container, text, true, false);
                contMode = null; lastNonBlank = it;
                continue;
            }
            if (startsEntry) {
                const obj = newEntryObj(tm[1]);
                if (tm[2]) obj.paras[0].push(tm[2]);
                if (section === "legendary") { if (legendaryIntro) { sections.legendary.intro = finishEntry(legendaryIntro).text || null; legendaryIntro = null; } sections.legendary.options.push(obj); }
                else sections[section].push(obj);
                container = obj;
                contMode = null;
                textOut.push({ kind: "entry", obj, section });
                lastNonBlank = it;
                continue;
            }
            // otherwise: an indented hanging continuation that happens to look like "Name." (e.g. "  Paralyzing Touch.")
        }

        if (descParas === null) {
            let newPara = false, soft = false, startDesc = false;
            if (listLine) { soft = true; contMode = "list"; }
            else if (it.indent >= 1) {
                if (section === "legendary") { /* hanging continuation */ }
                else if (isCap(text) && prevEnds && !nextIndented) { newPara = true; contMode = null; }
                /* else: hanging or list continuation */
            } else {
                if (!isColTop) {
                    startDesc = !!(container && lastNonBlank && prevEnds && isCap(text) && oracle.startsLine(text) && oracle.endsLine(lastNonBlank.text));
                } else if (isAppendix && container && prevEnds && isCap(text) && !RULES_OPENER_RE.test(text) && mentionsCreature(text, entry.name)) {
                    startDesc = true;
                    makeNote(entry, "description starts at the top of a column on page " + it.page + "; classified by the column-top rule (sentence boundary, non-rule opener, names the creature)");
                }
                if (contMode === "list" && !/^[a-z]/.test(text)) contMode = null;
            }
            if (startDesc) {
                descParas = [[text]];
                textOut.push({ kind: "desc" });
                contMode = null; lastNonBlank = it;
                continue;
            }
            if (!container) {
                container = newEntryObj(null);
                sections[section === "legendary" ? "traits" : section].push(container);
                textOut.push({ kind: "entry", obj: container, section });
                makeNote(entry, "body text without an entry name on page " + it.page + ": " + JSON.stringify(text.slice(0, 60)));
            }
            addLine(container, text, newPara, soft);
        } else {
            let newPara = false;
            const tableRow = /\s{2,}\S+\s{2,}/.test(it.raw.trim());
            if (tableRow) newPara = true;
            else if (it.indent >= 1) newPara = isCap(text) && prevEnds && !nextIndented;
            else if (!isColTop) newPara = !!(lastNonBlank && prevEnds && isCap(text) && oracle.startsLine(text) && oracle.endsLine(lastNonBlank.text));
            else newPara = prevEnds && isCap(text);
            if (newPara) descParas.push([text]); else descParas[descParas.length - 1].push(text);
        }
        lastNonBlank = it;
    }
    if (legendaryIntro && sections.legendary) { sections.legendary.intro = finishEntry(legendaryIntro).text || null; }

    data.traits = sections.traits.map(finishEntry);
    data.actions = sections.actions.map(o => { const e = finishEntry(o); const atk = parseAttack(e.text); if (atk) e.attack = atk; return e; });
    data.reactions = sections.reactions.map(finishEntry);
    data.legendaryActions = sections.legendary ? { intro: sections.legendary.intro, options: sections.legendary.options.map(finishEntry) } : null;
    data.description = descParas ? descParas.map(joinPara).join("\n\n") : null;

    // entry text fragments in reading order
    const frags = [];
    for (const f of textOut) {
        if (f.kind === "heading") frags.push(f.text);
        else if (f.kind === "entry") { const e = finishEntry(f.obj); frags.push(e.name ? e.name + ". " + e.text : e.text); }
        else if (f.kind === "desc") frags.push(data.description);
    }
    if (sections.legendary && sections.legendary.intro) {
        const at = frags.indexOf("Legendary Actions");
        if (at >= 0) frags.splice(at + 1, 0, sections.legendary.intro);
    }
    return frags;
}

// ---------------------------------------------------------------------------------------------------
// Interstitial prose (family text, variant sidebars)
// ---------------------------------------------------------------------------------------------------
function proseParagraphs(items, oracles) {
    const paras = [];
    let last = null;
    for (const it of items) {
        if (it.blank) continue;
        const oracle = oracles(it.page);
        const text = it.text;
        const tableRow = /\s{2,}\S/.test(it.raw.trim());
        let newPara = paras.length === 0;
        if (!newPara) {
            if (tableRow) newPara = true;
            else if (it.indent >= 1 && isCap(text) && !it.colTop) newPara = true;
            else if (it.indent === 0 && !it.colTop && last && oracle.startsLine(text) && oracle.endsLine(last.text) && isCap(text) && endsSentence(last.text)) newPara = true;
            else if (TRAIT_NAME_RE.test(text) && it.indent >= 1) newPara = true;
            else if (last && /\s{2,}\S/.test(last.raw.trim())) newPara = true; // line after a table row
        }
        if (newPara) paras.push([tableRow ? it.raw.trim().replace(/\s{2,}/g, " | ") : text]);
        else paras[paras.length - 1].push(text);
        last = it;
    }
    return paras.map(lines => {
        let s = "";
        for (const l of lines) { if (!s) s = l; else if (/[-‑‐]$/.test(s) && /^[a-z]/.test(l)) s += l; else s += " " + l; }
        return s;
    });
}

// ---------------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------------
function main() {
    const manifest = JSON.parse(readCache("manifest.json"));
    const sectionsFile = JSON.parse(readCache("sections.json"));
    const sections = (sectionsFile.sections || manifest.sections).filter(s => s.category === CATEGORY);
    if (!sections.length) throw new Error("no creature sections in cache/sections.json");
    const warnings = [];
    const warn = (page, message) => warnings.push({ page, message });
    const oracleCache = new Map();
    const oracles = page => { if (!oracleCache.has(page)) oracleCache.set(page, readingOracle(page)); return oracleCache.get(page); };

    const entries = [];
    const idIndex = new Map();
    const parserDefeats = new Set();

    for (const section of sections) {
        const [p0, p1] = section.pages;
        // 1. line stream for the section
        let stream = [];
        let geom = null;
        for (let p = p0; p <= p1; p++) {
            if (!fs.existsSync(path.join(CACHE, "page_" + pad3(p) + ".layout.txt"))) { warn(p, "layout page missing from cache"); continue; }
            const r = pageStream(p, geom, warnings);
            stream = stream.concat(r.stream);
            geom = r.geom;
        }
        // 2. anchors: name lines, letter headings, group headings, variant headings
        const isAppendix = /^appendix/i.test(section.id);
        const anchors = [];
        let firstNameIdx = -1;
        for (let i = 0; i < stream.length; i++) {
            const it = stream[i];
            if (it.blank) continue;
            const ni = nameLineAt(stream, i);
            if (ni) { anchors.push({ type: "name", idx: i, info: ni }); if (firstNameIdx < 0) firstNameIdx = i; continue; }
            if (LETTER_HEADING_RE.test(it.text) && it.indent <= 2) { anchors.push({ type: "letter", idx: i, text: it.text, key: plain(LETTER_HEADING_RE.exec(it.text)[1]) }); continue; }
            const vm = VARIANT_HEADING_RE.exec(it.text);
            if (vm && it.indent <= 2) { anchors.push({ type: "variant", idx: i, text: it.text, title: vm[1] }); continue; }
            if (!isAppendix && it.indent <= 2 && it.text.length <= 40 && it.text.split(/\s+/).length <= 4 && !/[.;!?]$/.test(it.text) && isTitleCase(it.text) && !STAT_KEY_RE.test(it.text) && !SECTION_HEADING_RE.test(it.text) && !ABILITY_HEADER_RE.test(it.text) && oracles(it.page).exactLine(it.text)) {
                // a group heading is a title-case line alone on a reading-order line, followed (after prose) by a name line
                anchors.push({ type: "group", idx: i, text: it.text, stem: singularStem(it.text) });
            }
        }
        if (firstNameIdx > 0) {
            const skipped = stream.slice(0, firstNameIdx).filter(it => !it.blank && !LETTER_HEADING_RE.test(it.text));
            if (skipped.length) warn(skipped[0].page, "skipped " + skipped.length + " intro line(s) before the first stat block of section \"" + section.title + "\": " + JSON.stringify(squash(skipped.map(s => s.text).join(" ")).slice(0, 120)) + "...");
        }
        // drop group anchors that are not followed by a name line before the next letter heading (stray title-case lines)
        const nameAnchors = anchors.filter(a => a.type === "name");
        const sectionEntries = [];
        const groupStack = []; // [{ text, stem, tokens, prose: [] }]
        const nextHeadingAfter = idx => anchors.find(a => a.idx > idx && (a.type === "letter" || a.type === "group"));

        for (let n = 0; n < nameAnchors.length; n++) {
            const a = nameAnchors[n];
            const nextA = nameAnchors[n + 1];
            const endIdx = nextA ? nextA.idx : stream.length;
            // interstitial anchors between this block's start and the next name line
            const between = anchors.filter(x => x.idx > a.idx && x.idx < endIdx && x.type !== "name");
            // interstitial anchors before this block (since previous block end) are processed when the previous block ends; for the
            // first block, process anchors before it.
            const info = a.info;
            const name = info.name;
            const entry = {
                id: null, category: CATEGORY, kind: KIND, name,
                source: { document: S.SOURCE_DOCUMENT, pages: [stream[a.idx].page], section: section.title, heading: name },
                text: "", data: {}, dice: [], readiness: "extracted", notes: []
            };
            const data = entry.data;
            // size line
            let sizeText = stream[info.sizeIdx].text;
            if (info.sizeCont !== null) sizeText += " " + stream[info.sizeCont].text;
            const sm = SIZE_LINE_RE.exec(sizeText);
            data.size = sm[1]; data.type = sm[2]; data.subtype = sm[3] || null; data.alignment = squash(sm[4]);
            // header: from acIdx to the Challenge line
            let hi = info.acIdx, chIdx = -1;
            for (let j = info.acIdx; j < endIdx; j++) { if (!stream[j].blank && /^Challenge\b/.test(stream[j].text)) { chIdx = j; break; } if (j - info.acIdx > 40) break; }
            if (chIdx < 0) { makeNote(entry, "Challenge line not found; header parsed to the first body heading"); chIdx = info.acIdx; for (let j = info.acIdx; j < endIdx; j++) { if (SECTION_HEADING_RE.test(stream[j].text)) break; chIdx = j; } }
            // the header may contain a wrapped "Challenge" value? never; stop at chIdx
            const headerItems = stream.slice(info.acIdx, chIdx + 1);
            const headerText = parseHeader(headerItems, info, entry, data);
            // body: after chIdx to the first interstitial anchor (letter/group heading) or the next name line
            let bodyEnd = endIdx;
            const stops = between.filter(x => x.type === "letter" || x.type === "group" || x.type === "variant");
            if (stops.length) bodyEnd = stops[0].idx;
            const bodyItems = stream.slice(chIdx + 1, bodyEnd);
            const bodyFrags = parseBody(bodyItems, entry, data, oracles, { isAppendix });
            // pages spanned
            const pages = new Set();
            for (let j = a.idx; j < bodyEnd; j++) if (!stream[j].blank) pages.add(stream[j].page);
            entry.source.pages = Array.from(pages).sort((x, y) => x - y);
            // defaults for required fields
            for (const k of ["savingThrows", "skills"]) if (data[k] === undefined) data[k] = {};
            for (const k of ["damageVulnerabilities", "damageResistances", "damageImmunities", "conditionImmunities"]) if (data[k] === undefined) data[k] = [];
            for (const k of ["armorClass", "hitPoints", "speed", "senses", "languages", "challenge"]) if (data[k] === undefined) data[k] = null;
            // family membership (A to Z only)
            data.family = null;
            if (!isAppendix) {
                const lname = plain(name);
                let member = false;
                if (groupStack.length) {
                    const inner = groupStack[groupStack.length - 1];
                    const outer = groupStack[0];
                    if (lname.includes(inner.stem)) member = true;
                    else if (inner.tokens.length && inner.tokens.every(t => lname.includes(t))) member = true;
                    else {
                        const nh = nextHeadingAfter(a.idx);
                        const upper = nh ? (nh.type === "letter" ? nh.key : nh.stem) : null;
                        const fits = lname > outer.stem && (upper === null || lname < upper);
                        member = !fits;
                    }
                    if (!member) groupStack.length = 0;
                }
                if (member) {
                    const inner = groupStack[groupStack.length - 1];
                    data.family = { name: inner.text, text: inner.prose.join("\n\n"), path: groupStack.map(g => g.text) };
                }
            }
            // text
            const textParts = [name, sizeText.replace(/\s+/g, " ")].concat(headerText).concat(bodyFrags);
            entry.text = textParts.filter(Boolean).join("\n\n");
            sectionEntries.push({ entry, anchor: a, bodyEnd, endIdx });
            // process interstitial anchors after this block: group headings and their prose, letter headings, variants
            for (let s = 0; s < stops.length; s++) {
                const st = stops[s];
                const segEnd = s + 1 < stops.length ? stops[s + 1].idx : endIdx;
                const segItems = stream.slice(st.idx + 1, segEnd);
                if (st.type === "letter") { groupStack.length = 0; continue; }
                if (st.type === "variant") {
                    const paras = proseParagraphs(segItems, oracles);
                    const title = st.title;
                    const ttoks = plain(title).split(/\s+/).map(w => PLURALS[w] || w.replace(/s$/, ""));
                    let bestE = null, bestN = 0;
                    for (const se of sectionEntries) {
                        const ntoks = plain(se.entry.name).split(/\s+/).filter(w => !CONNECTORS.has(w)).map(w => PLURALS[w] || w.replace(/s$/, ""));
                        if (ntoks.every(t => ttoks.includes(t)) && ntoks.length > bestN) { bestE = se.entry; bestN = ntoks.length; }
                    }
                    const vtext = [st.text].concat(paras).join("\n\n");
                    if (bestE) {
                        bestE.data.variants = (bestE.data.variants || []).concat([{ name: title, text: paras.join("\n\n") }]);
                        bestE.text += "\n\n" + vtext;
                        bestE.source.pages = uniq(bestE.source.pages.concat(segItems.filter(x => !x.blank).map(x => x.page))).sort((x, y) => x - y);
                        makeNote(bestE, "variant sidebar \"" + st.text + "\" (page " + stream[st.idx].page + ") attached");
                    } else warn(stream[st.idx].page, "variant sidebar \"" + st.text + "\" matches no creature in the section; skipped");
                    continue;
                }
                // group heading: nest / replace, then collect its prose (lines before the next anchor)
                const g = { text: st.text, stem: st.stem, tokens: stemTokens(st.stem), prose: [] };
                while (groupStack.length) {
                    const top = groupStack[groupStack.length - 1];
                    if (top.stem === g.stem || !g.stem.includes(top.stem)) groupStack.pop(); else break;
                }
                groupStack.push(g);
                const proseItems = segItems.filter(x => !x.blank);
                if (proseItems.length) {
                    g.prose = proseParagraphs(segItems, oracles);
                    if (!nextA) warn(stream[st.idx].page, "prose after heading \"" + st.text + "\" has no following stat block; skipped");
                    const tableRows = g.prose.filter(p => p.includes(" | ")).length;
                    if (tableRows) warn(stream[st.idx].page, "heading \"" + st.text + "\": " + tableRows + " table row(s) captured as printed lines with cells separated by \" | \" in data.family.text; cells that wrap onto a second line are not reassembled");
                }
            }
            // orphan prose: body items after the last named entry that could not be attached are in the description (handled in parseBody)
        }
        // interstitial anchors before the first block (letter headings only; group headings before the first block are rare)
        for (const se of sectionEntries) entries.push(se.entry);
        // group headings that never got a member
        for (const g of anchors.filter(x => x.type === "group")) {
            const used = sectionEntries.some(se => se.entry.data.family && se.entry.data.family.path.includes(g.text));
            if (!used) warn(stream[g.idx].page, "heading \"" + g.text + "\" introduces no stat block that could be attached to it; skipped");
        }
    }

    // ids, dice, readiness
    for (const e of entries) {
        let id = T.stableId(KIND, e.name);
        if (idIndex.has(id)) {
            const variant = e.source.section.replace(/^Appendix\s+/, "").replace(/:.*$/, "") + " p" + e.source.pages[0];
            const other = idIndex.get(id);
            id = T.stableId(KIND, e.name, variant);
            e.notes.push("duplicate name \"" + e.name + "\" (also on page " + other.source.pages[0] + "); id made unique with variant " + JSON.stringify(variant));
            warnings.push({ page: e.source.pages[0], message: "duplicate creature name \"" + e.name + "\" resolved as " + id });
        }
        e.id = id;
        idIndex.set(id, e);
        e.dice = T.findDice(e.text);
        const d = e.data;
        const missing = [];
        for (const k of S.REQUIRED_DATA.creature) if (d[k] === undefined || d[k] === null) missing.push(k);
        if (d.armorClass && d.armorClass.value === null) missing.push("armorClass.value");
        if (d.hitPoints && (d.hitPoints.average === null || d.hitPoints.formula === null)) missing.push("hitPoints.formula");
        if (d.speed && d.speed.walk === null) missing.push("speed.walk");
        if (d.abilities && ABILITY_NAMES.some(a => typeof d.abilities[a.toLowerCase()] !== "number")) missing.push("abilities");
        if (d.senses && d.senses.passivePerception === null) missing.push("senses.passivePerception");
        if (d.challenge && (d.challenge.rating === null || d.challenge.xp === null)) missing.push("challenge");
        if (missing.length) { e.readiness = "extracted"; e.notes.push("required field(s) not parsed: " + uniq(missing).join(", ")); }
        else e.readiness = "parsed";
        for (const n of e.notes) if (/not understood|not found|not parsed|expected 6 scores|without an entry name/.test(n)) parserDefeats.add(e.source.pages[0]);
    }

    // staging file
    const staging = {
        metadata: {
            generator: GENERATOR,
            generatedAt: new Date().toISOString(),
            category: CATEGORY,
            kind: KIND,
            source: { file: manifest.source.file, sha256: manifest.source.sha256, pages: sections.map(s => s.pages.slice()) },
            cache: { generatedAt: manifest.generatedAt },
            license: { id: S.LICENSE.id, attribution: S.ATTRIBUTION },
            expected: { count: EXPECTED, tolerance: TOLERANCE }
        },
        entries,
        warnings
    };
    fs.mkdirSync(STAGING_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(staging, null, 2) + "\n", "utf8");

    // ------------------------------------------------------------------------------------------------
    // Self-check
    // ------------------------------------------------------------------------------------------------
    const results = [];
    const check = (ok, label) => { results.push({ ok, label }); console.log((ok ? "PASS" : "FAIL") + "  " + label); };
    const count = entries.length;
    check(Math.abs(count - EXPECTED) <= TOLERANCE, "entry count " + count + " within " + TOLERANCE + " of " + EXPECTED);
    const ids = entries.map(e => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    check(dupes.length === 0, "duplicate ids: " + (dupes.length ? uniq(dupes).join(", ") : "none"));
    const emptyText = entries.filter(e => !e.text || !e.text.trim());
    check(emptyText.length === 0, "entries with empty text: " + emptyText.length);
    const parsedBad = entries.filter(e => e.readiness === "parsed").map(e => S.validateEntry(e, { strict: true })).filter(p => p.length);
    check(parsedBad.length === 0, "parsed entries failing the required-field check: " + parsedBad.length + (parsedBad.length ? " (" + parsedBad[0][0] + ")" : ""));
    const noAbil = entries.filter(e => !e.data.abilities || ABILITY_NAMES.some(a => typeof e.data.abilities[a.toLowerCase()] !== "number"));
    check(noAbil.length === 0, "entries without six ability scores: " + noAbil.length + (noAbil.length ? " (" + noAbil.map(e => e.name + " p" + e.source.pages[0]).join(", ") + ")" : ""));
    const fileProblems = S.validateFile(staging, { strict: true });
    check(fileProblems.length === 0, "schema validation problems: " + fileProblems.length + (fileProblems.length ? " (" + fileProblems[0] + ")" : ""));
    // Every line of every entry text must occur in the reading-order pages it was taken from (the two
    // pdftotext modes are independent renderings, so a line glued from two columns cannot pass this).
    const roText = new Map();
    const roFor = p => { if (!roText.has(p)) { const f = path.join(CACHE, "page_" + pad3(p) + ".txt"); roText.set(p, fs.existsSync(f) ? squash(fs.readFileSync(f, "utf8")).replace(/- /g, "-") : ""); } return roText.get(p); };
    let linesChecked = 0; const linesMissing = [];
    for (const e of entries) {
        const pages = e.source.pages;
        let R = ""; for (let p = pages[0] - 1; p <= pages[pages.length - 1] + 1; p++) R += " " + roFor(p);
        for (const para of e.text.split(/\n\n+/)) for (const line of para.split("\n")) {
            const s = squash(line).replace(/- /g, "-");
            if (!s || s.startsWith("STR DEX") || /^\d+ \([+-]\d+\)/.test(s)) continue;
            linesChecked++;
            let ok = R.includes(s);
            if (!ok) { const chunks = []; for (let i = 0; i < s.length; i += 40) chunks.push(s.slice(i, i + 40)); ok = chunks.filter(c => c.length >= 16).every(c => R.includes(c)); }
            if (!ok) linesMissing.push(e.name + " p" + pages[0] + ": " + JSON.stringify(s.slice(0, 80)));
        }
    }
    check(linesMissing.length === 0, "entry text lines found in the reading-order pages: " + (linesChecked - linesMissing.length) + "/" + linesChecked + (linesMissing.length ? " (first miss: " + linesMissing[0] + ")" : ""));
    for (const nm of SPOT_CHECK) {
        const e = entries.find(x => x.name === nm);
        if (!e) { check(false, "spot check " + nm + ": not found"); continue; }
        const d = e.data;
        const line = nm + " | pages " + e.source.pages.join(",") + " | AC " + (d.armorClass ? d.armorClass.value + (d.armorClass.note ? " (" + d.armorClass.note + ")" : "") : "?") + " | HP " + (d.hitPoints ? d.hitPoints.average + " (" + d.hitPoints.formula + ")" : "?") + " | CR " + (d.challenge ? d.challenge.ratingText + " (" + d.challenge.xp + " XP)" : "?") + " | " + e.readiness;
        const ok = !!(d.armorClass && d.armorClass.value !== null && d.hitPoints && d.hitPoints.formula && d.challenge && d.challenge.xp !== null && e.readiness === "parsed");
        check(ok, "spot check " + line);
    }
    const parsed = entries.filter(e => e.readiness === "parsed").length;
    console.log("entries " + count + " (parsed " + parsed + ", extracted " + (count - parsed) + "), warnings " + warnings.length + ", wrote " + path.relative(path.resolve(__dirname, "..", ".."), OUT_FILE));
    const extracted = entries.filter(e => e.readiness !== "parsed");
    for (const e of extracted) console.log("  extracted: " + e.name + " (page " + e.source.pages[0] + "): " + e.notes.filter(n => /required field|not parsed|expected 6/.test(n)).join("; "));
    if (parserDefeats.size) console.log("parser defeated on pages: " + Array.from(parserDefeats).sort((a, b) => a - b).join(", "));
    const failed = results.filter(r => !r.ok).length;
    console.log(failed ? "FAIL  " + failed + " check(s) failed" : "PASS  all checks");
    process.exitCode = failed ? 1 : 0;
}

if (require.main === module) {
    try { main(); }
    catch (err) { console.error("FAIL  " + (err && err.stack || err)); process.exitCode = 1; }
}

module.exports = { parseAttack, parseSpeed, parseSenses, parseChallenge, parseArmorClass, parseHitPoints, cutLine, splitNameTail };
