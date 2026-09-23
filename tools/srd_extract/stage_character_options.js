// tools/srd_extract/stage_character_options.js - SRD 5.1 stager for the `character-options` category.
//
// Usage: node tools/srd_extract/stage_character_options.js [--debug]
// Reads:  tools/srd_extract/cache/ (read-only) through the page model exported by stage_rules.js.
// Writes: tools/srd_extract/staging/staging_character_options.json
// Scope:  pages 3-7 (Races), 8-55 (Classes), 56-61 (Beyond 1st Level: multiclassing, alignment,
//         languages, inspiration, backgrounds) and 75 (Feats: the Grappler feat is printed there, between
//         the equipment chapter and Using Ability Scores; lead's correction of 2026-09-22).
// Kinds:  race, subrace, class, subclass, background, feat; plus `rule` entries (category `rules`) for
//         the chapter prose of Races and Beyond 1st Level so those pages are fully covered.
// Contract: docs/SRD5_1_COVERAGE_MANIFEST.md (sections 4-7). Exit 1 when any self-check fails.
//
// Class tables: pdftotext drifts the cells of a row onto neighbouring lines but keeps every column
// in order, so each column is read top to bottom (20 values each). The Features column wraps its
// cells over several lines; the lines are joined back into exactly 20 cells by a segmentation that
// only accepts cells made of the class's own printed feature headings ("Ability Score Improvement",
// "Extra Attack (2)", "Path feature", "Wild Shape improvement", "—"); the segmentation must be unique
// or the table is reported as not parsed.
"use strict";

const fs = require("fs");
const path = require("path");
const T = require("./lib/srd_text");
const M = require("./stage_rules.js");

const DEBUG = process.argv.includes("--debug");
const CO_PAGES = [[3, 61], [75, 75]];
const CATEGORY = "character-options";

const REQUIRED = {
    race: ["traits", "abilityScoreIncrease", "size", "speed", "languages", "subraces"],
    subrace: ["traits", "abilityScoreIncrease", "size", "speed", "languages", "parent"],
    class: ["hitDie", "savingThrows", "proficiencies", "startingEquipment", "classTable", "features", "subclasses"],
    subclass: ["parentClass", "features"],
    background: ["skillProficiencies", "languages", "equipment", "feature", "characteristics"],
    feat: ["prerequisite", "benefits"],
    rule: ["headingPath", "tables"]
};

const norm = s => T.toPlain(s).replace(/\s+/g, " ").trim().toLowerCase();

// ============================================================================================
// Races (pages 3-7)
// ============================================================================================

const RACES = [
    { name: "Dwarf", subraces: ["Hill Dwarf"] },
    { name: "Elf", subraces: ["High Elf"] },
    { name: "Halfling", subraces: ["Lightfoot"] },
    { name: "Human", subraces: [] },
    { name: "Dragonborn", subraces: [] },
    { name: "Gnome", subraces: ["Rock Gnome"] },
    { name: "Half-Elf", subraces: [] },
    { name: "Half-Orc", subraces: [] },
    { name: "Tiefling", subraces: [] }
];
const RACE_TABLES = [
    { caption: "Draconic Ancestry", columns: ["Dragon", "Damage Type", "Breath Weapon"], until: "Draconic Ancestry." }
];

/** "Name. text" paragraphs of a block range, with following bullet paragraphs appended to the trait. */
function traitsOf(blocks, kinds, from, to) {
    const traits = [];
    let inOptions = false; // after "choose one of the following options:" the run-in items belong to the trait
    for (let i = from; i < to; i++) {
        const k = kinds[i];
        if (k === "heading" || k === "table") continue;
        for (const p of M.blockParagraphs(blocks[i], k)) {
            const m = p.match(/^([A-Z][A-Za-z’' -]{1,40}?)\.\s+(.+)$/s);
            const runIn = m && m[1].split(/\s+/).length <= 5 && !/^(A|An|The|Your|You|As|In|It|If|On|At|By|For|When|Once|Some|Most|Many|Each|Every|This|These|Those|While|Although|Unless|Whenever|After|Before|Because)$/.test(m[1].split(/\s+/)[0]) && k !== "bullets";
            if (runIn && !inOptions) {
                traits.push({ name: m[1], text: p });
            } else if (traits.length) {
                traits[traits.length - 1].text += "\n" + p;
            }
            if (traits.length) inOptions = /:$/.test(p) || (inOptions && runIn);
        }
    }
    return traits;
}

function raceData(traits) {
    const find = n => traits.find(t => norm(t.name) === norm(n));
    const asi = find("Ability Score Increase");
    const size = find("Size"), speed = find("Speed"), lang = find("Languages");
    const sizeWord = size && (size.text.match(/[Yy]our size is (\w+)\./) || [])[1];
    const speedFeet = speed && (speed.text.match(/base walking speed is (\d+) feet/) || [])[1];
    return {
        traits,
        abilityScoreIncrease: asi ? asi.text.replace(/^Ability Score Increase\.\s+/, "") : null,
        size: sizeWord || null,
        speed: speedFeet ? parseInt(speedFeet, 10) : null,
        languages: lang ? lang.text.replace(/^Languages\.\s+/, "") : null
    };
}

function stageRaces(entries, warnings) {
    const flow = M.rangeFlow(3, 7);
    const blocks = M.blocksOf(flow);
    const kinds = blocks.map(M.blockKind);
    const section = "Races";
    const hits = resolveTables(RACE_TABLES, flow, blocks, kinds, warnings, 3);

    const h0 = M.findHeading(blocks, "Races", 0, kinds);
    if (!h0) { warnings.push({ page: 3, message: "chapter heading \"Races\" not found" }); return; }
    // the first line of page 3 is the document's errata notice, printed above the chapter title
    for (let i = 0; i < h0.index; i++) warnings.push({ page: 3, message: `text above the Races heading belongs to no entry: "${M.blockText(blocks[i]).slice(0, 80)}"` });

    // locate race and subrace headings in order
    const marks = [];
    let from = h0.index + h0.span;
    for (const r of RACES) {
        const h = M.findHeading(blocks, r.name, from, kinds);
        if (!h) { warnings.push({ page: 3, message: `race heading "${r.name}" not found` }); continue; }
        marks.push({ kind: "race", name: r.name, index: h.index, spec: r });
        from = h.index + 1;
        for (const s of r.subraces) {
            const hs = M.findHeading(blocks, s, from, kinds);
            if (!hs) { warnings.push({ page: 3, message: `subrace heading "${s}" not found` }); continue; }
            marks.push({ kind: "subrace", name: s, index: hs.index, parent: r.name });
            from = hs.index + 1;
        }
    }
    // chapter intro (Racial Traits) as a rule entry
    {
        const r = M.renderBlocks(blocks, kinds, h0.index, marks[0].index, hits, warnings);
        const subheadings = [];
        for (let i = h0.index + h0.span; i < marks[0].index; i++) if (kinds[i] === "heading") subheadings.push(M.blockText(blocks[i]));
        entries.push(M.makeEntry({ kind: "rule", category: "rules", name: "Races: Racial Traits", heading: "Racial Traits", pages: r.pages, section, text: r.text,
            data: { headingPath: ["Races", "Racial Traits"], subheadings, tables: [] } }));
    }
    const parents = new Map();
    for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        const to = i + 1 < marks.length ? marks[i + 1].index : blocks.length;
        const r = M.renderBlocks(blocks, kinds, m.index, to, hits, warnings);
        const traits = traitsOf(blocks, kinds, m.index + 1, to);
        const tables = hits.filter(h => h.fromBlock >= m.index && h.fromBlock < to && h.table).map(h => ({ caption: h.table.caption, columns: h.table.columns, rows: h.table.rows }));
        const notes = [];
        if (m.kind === "race") {
            const data = raceData(traits);
            data.subraces = m.spec.subraces.slice();
            data.tables = tables;
            for (const f of ["abilityScoreIncrease", "size", "speed", "languages"]) if (data[f] === null) notes.push(`missing: ${f} (trait not found or not in the printed wording)`);
            parents.set(m.name, data);
            entries.push(M.makeEntry({ kind: "race", category: CATEGORY, name: m.name, pages: r.pages, section, text: r.text, data, notes }));
        } else {
            const own = raceData(traits);
            const parent = parents.get(m.parent) || {};
            const data = {
                traits: own.traits,
                abilityScoreIncrease: own.abilityScoreIncrease,
                size: parent.size === undefined ? null : parent.size,
                speed: parent.speed === undefined ? null : parent.speed,
                languages: parent.languages === undefined ? null : parent.languages,
                parent: m.parent,
                inheritedFromParent: ["size", "speed", "languages"],
                tables
            };
            if (data.abilityScoreIncrease === null) notes.push("missing: abilityScoreIncrease");
            entries.push(M.makeEntry({ kind: "subrace", category: CATEGORY, name: m.name, pages: r.pages, section, text: r.text, data, notes }));
        }
    }
}

// ============================================================================================
// Tables of the character-options pages
// ============================================================================================

/** Locate and parse a list of table specs inside a flow; returns hits with block indices. */
function resolveTables(specs, flow, blocks, kinds, warnings, firstPage) {
    const hits = [];
    hits.splits = 0; // blocks inserted by splitting at an `until` line (callers advance their end index)
    for (const spec of specs) {
        let region = M.tableRegion(flow, spec, 0);
        if (spec.secondOccurrence && region) region = M.tableRegion(flow, spec, region.start + 1);
        if (!region) { warnings.push({ page: firstPage, message: `table "${spec.caption}" not located` }); continue; }
        let table = M.readTable(region.lines, spec);
        if (table.error) { warnings.push({ page: region.lines[0].page, message: table.error }); table = null; }
        const startLine = flow[region.start], endLine = region.end < flow.length ? flow[region.end] : null;
        const fromBlock = blocks.findIndex(b => b.lines.includes(startLine));
        let toBlock = endLine ? blocks.findIndex(b => b.lines.includes(endLine)) : blocks.length;
        if (fromBlock < 0) { warnings.push({ page: startLine.page, message: `table "${spec.caption}" region start not in a block` }); continue; }
        if (toBlock < 0) toBlock = blocks.length;
        if (endLine && blocks[toBlock].lines[0] !== endLine) {
            const blk = blocks[toBlock];
            const cut = blk.lines.indexOf(endLine);
            const head = { lines: blk.lines.slice(0, cut), pages: [...new Set(blk.lines.slice(0, cut).map(l => l.page))] };
            const tail = { lines: blk.lines.slice(cut), pages: [...new Set(blk.lines.slice(cut).map(l => l.page))] };
            blocks.splice(toBlock, 1, head, tail);
            kinds.splice(toBlock, 1, M.blockKind(head), M.blockKind(tail));
            // earlier hits that lie beyond the split point move down by one block
            for (const h of hits) { if (h.fromBlock > toBlock) h.fromBlock++; if (h.toBlock > toBlock) h.toBlock++; }
            hits.splits++;
            toBlock += 1;
        }
        hits.push({ spec, table, fromBlock, toBlock, page: startLine.page, pages: [...new Set(region.lines.filter(l => !l.brk).map(l => l.page))] });
    }
    return hits;
}

// ============================================================================================
// Classes (pages 8-55)
// ============================================================================================

const CLASSES = [
    { name: "Barbarian", subclass: "Path of the Berserker", subclassIntro: null, sidebars: [] },
    { name: "Bard", subclass: "College of Lore", subclassIntro: null, sidebars: [] },
    { name: "Cleric", subclass: "Life Domain", subclassIntro: null, sidebars: [],
        tables: [
            { caption: "Destroy Undead", columns: ["Cleric Level", "Destroys Undead of CR . . ."], until: "Divine Intervention", secondOccurrence: true },
            { caption: "Life Domain Spells", columns: ["Cleric Level", "Spells"], until: "Bonus Proficiency" }
        ] },
    { name: "Druid", subclass: "Circle of the Land", subclassIntro: null, sidebars: ["Sacred Plants and Wood", "Druids and the Gods"],
        tables: [
            // the printed CR cells sit under the Level header, so cells are classified by content and position
            { caption: "Beast Shapes", columns: ["Level", "Max. CR", "Limitations", "Example"], headerWords: ["Max.", "CR"], until: "You can stay in a beast shape",
                classify: t => /^\d+(st|nd|rd|th)$/.test(t.text) ? 0 : /^\d+(\/\d+)?$/.test(t.text) ? 1 : t.x >= 30 ? 3 : 2 },
            { caption: "Arctic", columns: ["Druid Level", "Circle Spells"], until: "Coast", headerDepth: 8 },
            { caption: "Coast", columns: ["Druid Level", "Circle Spells"], until: "Desert", headerDepth: 8 },
            { caption: "Desert", columns: ["Druid Level", "Circle Spells"], until: "Forest", headerDepth: 8 },
            { caption: "Forest", columns: ["Druid Level", "Circle Spells"], until: "Grassland", headerDepth: 8 },
            { caption: "Grassland", columns: ["Druid Level", "Circle Spells"], until: "Mountain", headerDepth: 8 },
            { caption: "Mountain", columns: ["Druid Level", "Circle Spells"], until: "Swamp", headerDepth: 8 },
            { caption: "Swamp", columns: ["Druid Level", "Circle Spells"], until: "Land’s Stride", headerDepth: 8 }
        ] },
    { name: "Fighter", subclass: "Champion", subclassIntro: "Martial Archetypes", sidebars: [] },
    { name: "Monk", subclass: "Way of the Open Hand", subclassIntro: "Monastic Traditions", sidebars: [] },
    { name: "Paladin", subclass: "Oath of Devotion", subclassIntro: "Sacred Oaths", sidebars: ["Breaking Your Oath"], nonFeatureSubsections: ["Tenets of Devotion"],
        tables: [
            { caption: "Oath of Devotion Spells", columns: ["Paladin Level", "Spells"], headerWords: ["Paladin", "Level"], until: "Channel Divinity" }
        ] },
    { name: "Ranger", subclass: "Hunter", subclassIntro: "Ranger Archetypes", sidebars: [] },
    { name: "Rogue", subclass: "Thief", subclassIntro: "Roguish Archetypes", sidebars: [] },
    { name: "Sorcerer", subclass: "Draconic Bloodline", subclassIntro: "Sorcerous Origins", sidebars: [],
        tables: [
            { caption: "Creating Spell Slots", columns: ["Spell Slot Level", "Sorcery Point Cost"], headerWords: ["Spell Slot", "Level", "Sorcery", "Point Cost"], until: "Converting a Spell Slot to Sorcery Points" },
            { caption: "Draconic Ancestry", columns: ["Dragon", "Damage Type"], until: "You can speak, read, and write Draconic", mode: "lastToken" }
        ] },
    { name: "Warlock", subclass: "The Fiend", subclassIntro: "Otherworldly Patrons", sidebars: ["Your Pact Boon"],
        tables: [
            { caption: "Fiend Expanded Spells", columns: ["Spell Level", "Spells"], until: "Dark One’s Blessing" }
        ] },
    { name: "Wizard", subclass: "School of Evocation", subclassIntro: "Arcane Traditions", sidebars: ["Your Spellbook"] }
];

const HEADER_TITLES = [
    ["Level", "Level"], ["Proficiency Bonus", "Proficiency"], ["Features", "Features"], ["Rages", "Rages"], ["Rage Damage", "Rage"],
    ["Cantrips Known", "Cantrips"], ["Spells Known", "Spells"], ["Martial Arts", "Martial"], ["Ki Points", "Ki"],
    ["Unarmored Movement", "Unarmored"], ["Sneak Attack", "Sneak"], ["Sorcery Points", "Sorcery"],
    ["Spell Slots", "Spell"], ["Slot Level", "Slot"], ["Invocations Known", "Invocations"]
];
const HEADER_WORDS = new Set(["Level", "Proficiency", "Bonus", "Features", "Rages", "Rage", "Damage", "Cantrips", "Known", "Spells", "Spell", "Slots", "Slot",
    "Martial", "Arts", "Ki", "Points", "Unarmored", "Movement", "Sneak", "Attack", "Sorcery", "Invocations", "per"]);
const ORDINAL = /^(\d+)(st|nd|rd|th)$/;

/** Single-space-joined cells of a line with start columns (two or more spaces separate cells). */
function cellsOf(text) {
    const out = [];
    const re = /\S(?:\S| (?=\S))*/g;
    let m;
    while ((m = re.exec(text)) !== null) out.push({ x: m.index, text: m[0] });
    return out;
}

/**
 * Parse a class table from its flow region (caption line through the last fragment line).
 * headings: Set of normalised feature headings printed in the class section.
 *
 * The region is read in parts: a run of lines on one page and one text column (x0). The first part
 * carries the header, which fixes the column positions; a table that continues in the next page
 * column (Barbarian, Fighter, Rogue) is laid out on a different character grid there, so each later
 * part takes its positions from its first row that shows a level, a bonus and a feature cell.
 */
function parseClassTable(region, className, headings, warnings) {
    const lines = region.filter(l => !l.brk);
    const page = lines[0].page;
    const fail = (msg) => { warnings.push({ page, message: `The ${className}: ${msg}` }); return null; };
    const numericLike = (t) => t === "—" || /^[+\-]?\d/.test(t) || /^Unlimited$/.test(t);
    // header region: from the caption to the first line whose leading token is "1st"
    let firstLevel = -1;
    for (let i = 1; i < lines.length; i++) { if (/^\s{0,3}1st\b/.test(lines[i].text)) { firstLevel = i; break; } }
    if (firstLevel < 0) return fail("no 1st-level row found");
    const xFeatures = (() => { for (let i = 1; i <= firstLevel; i++) { const k = lines[i].text.indexOf("Features"); if (k >= 0) return k; } return -1; })();
    if (xFeatures < 0) return fail("no Features header found");
    // header words with positions (outside the Features cell of the 1st-level line)
    const headerTokens = [];
    const slotHeaders = [];
    for (let i = 1; i <= firstLevel; i++) {
        for (const c of cellsOf(lines[i].text)) {
            if (i === firstLevel && c.x >= xFeatures - 1 && c.x < xFeatures + 2) continue; // the row's Features cell
            let x = c.x;
            for (const w of c.text.split(" ")) {
                const clean = w.replace(/^—|—$/g, "");
                if (HEADER_WORDS.has(clean)) headerTokens.push({ word: clean, x });
                else if (ORDINAL.test(clean) && x > xFeatures) slotHeaders.push({ word: clean, x });
                x += w.length + 1;
            }
        }
    }
    const titles = [];
    for (const [title, firstWord] of HEADER_TITLES) {
        const tok = headerTokens.find(t => t.word === firstWord && (title !== "Level" || t.x <= 3));
        if (!tok) continue;
        if (title === "Spell Slots" && slotHeaders.length) continue; // "Spell Slots per Spell Level" spanning header
        titles.push({ title, x: tok.x });
    }
    if (slotHeaders.length) titles.push({ title: "Spell Slots per Spell Level", x: slotHeaders[0].x, slots: slotHeaders.map(s => s.word) });
    titles.sort((a, b) => a.x - b.x);
    const names = titles.map(t => t.title);
    if (!names.includes("Level") || !names.includes("Proficiency Bonus") || !names.includes("Features")) return fail(`header columns not recognised: ${names.join(", ")}`);
    const iFeatures = names.indexOf("Features");
    const numericTitles = titles.filter(t => !["Level", "Proficiency Bonus", "Features"].includes(t.title));

    // parts: runs of lines on one page and text column
    const parts = [];
    lines.forEach((ln, li) => {
        const key = `${ln.page}:${ln.x0}`;
        if (!parts.length || parts[parts.length - 1].key !== key) parts.push({ key, lines: [] });
        parts[parts.length - 1].lines.push({ ln, li });
    });
    parts[0].xF = xFeatures;
    parts[0].xNext = iFeatures + 1 < titles.length ? titles[iFeatures + 1].x : Infinity;
    for (let p = 1; p < parts.length; p++) {
        const part = parts[p];
        for (const { ln } of part.lines) {
            const cells = cellsOf(ln.text);
            if (!cells.length || !ORDINAL.test(cells[0].text) || cells[0].x > 3) continue;
            let k = 1;
            if (k < cells.length && /^\+\d$/.test(cells[k].text)) k++;
            while (k < cells.length && numericLike(cells[k].text)) k++;
            if (k >= cells.length) continue;
            part.xF = cells[k].x;
            part.xNext = k + 1 < cells.length ? cells[k + 1].x : Infinity;
            break;
        }
        if (part.xF === undefined) return fail(`table part ${p} (page ${part.lines[0].ln.page}) has no row with a feature cell`);
    }

    // values
    const levels = [], profs = [], featureLines = [];
    const partOthers = parts.map(() => []);
    parts.forEach((part, p) => {
        for (const { ln, li } of part.lines) {
            if (li === 0) continue; // caption
            const text = ln.text;
            // feature cells start on the 1st-level line; earlier lines are the header
            const fSlice = li < firstLevel ? "" : text.slice(Math.max(0, part.xF - 1), part.xNext === Infinity ? undefined : part.xNext - 2).trim();
            if (fSlice && fSlice !== "Features" && !(li <= firstLevel && /^(Known|Bonus|—?Spell Slots per Spell Level—?|1st 2nd 3rd 4th 5th( 6th 7th 8th 9th)?)$/.test(fSlice))) featureLines.push({ li, text: fSlice });
            for (const c of cellsOf(text)) {
                if (c.x >= part.xF - 1 && c.x < part.xNext - 2) continue;
                const t = c.text;
                if (ORDINAL.test(t) && c.x <= 3) { levels.push(t); continue; }
                if (/^\+\d$/.test(t) && c.x > 3 && c.x < part.xF && (p > 0 || c.x < (titles[names.indexOf("Proficiency Bonus") + 1] || { x: Infinity }).x - 2)) { profs.push(t); continue; }
                if (li <= firstLevel && t.split(" ").every(w => HEADER_WORDS.has(w.replace(/^—|—$/g, "")) || ORDINAL.test(w))) continue;
                if (HEADER_WORDS.has(t)) continue;
                partOthers[p].push({ x: c.x, text: t, order: li * 1000 + c.x });
            }
        }
    });
    const expect = Array.from({ length: 20 }, (_, i) => `${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}`);
    if (levels.length !== 20 || levels.some((l, i) => l !== expect[i])) return fail(`Level column has ${levels.length} values: ${levels.join(" ")}`);
    if (profs.length !== 20) return fail(`Proficiency Bonus column has ${profs.length} values: ${profs.join(" ")}`);

    // numeric columns: clustered per part, then concatenated in printed order
    const columnsValues = numericTitles.map(() => []);
    if (numericTitles.length) {
        parts.forEach((part, p) => {
            const others = partOthers[p];
            if (!others.length) return;
            const clusters = M.clusterByX(others, numericTitles.length);
            if (!clusters) { columnsValues.error = `could not separate ${numericTitles.length} value columns (${numericTitles.map(t => t.title).join(", ")}) in part ${p} from cell positions ${[...new Set(others.map(o => o.x))].sort((a, b) => a - b).join(",")}`; return; }
            clusters.forEach((c, i) => columnsValues[i].push(...c.map(t => t.text)));
        });
        if (columnsValues.error) return fail(columnsValues.error);
        for (let i = 0; i < numericTitles.length; i++) if (columnsValues[i].length !== 20) return fail(`column "${numericTitles[i].title}" has ${columnsValues[i].length} values: ${columnsValues[i].join(" | ")}`);
    }
    // Features: segment the wrapped lines into 20 cells made of printed feature names
    const seg = segmentFeatures(featureLines.map(f => f.text), 20, headings);
    if (seg.error) return fail(`Features column: ${seg.error} (lines: ${featureLines.map(f => JSON.stringify(f.text)).join(", ")})`);

    // assemble rows in printed column order
    const columns = [];
    for (const t of titles) {
        if (t.slots) for (const s of t.slots) columns.push(`Spell Slots per Spell Level: ${s}`);
        else columns.push(t.title);
    }
    const rows = [];
    for (let r = 0; r < 20; r++) {
        const row = [];
        let ci = 0;
        for (const t of titles) {
            if (t.title === "Level") row.push(levels[r]);
            else if (t.title === "Proficiency Bonus") row.push(profs[r]);
            else if (t.title === "Features") row.push(seg.cells[r]);
            else if (t.slots) {
                const s = columnsValues[ci++][r].replace(/\s+/g, "");
                const chars = [...s];
                if (chars.length !== t.slots.length) return fail(`row ${levels[r]} has ${chars.length} spell-slot cells (${s}) for ${t.slots.length} slot columns`);
                row.push(...chars);
            } else row.push(columnsValues[ci++][r]);
        }
        rows.push(row);
    }
    if (DEBUG) console.error(`[${className}] columns ${JSON.stringify(columns)}\n` + rows.map(r => "  " + r.join(" | ")).join("\n"));
    return { caption: `The ${className}`, columns, rows };
}

/** Split "a, b (x), c" at commas outside parentheses. */
function splitItems(cell) {
    const items = [];
    let depth = 0, cur = "";
    for (const ch of cell) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) { items.push(cur.trim()); cur = ""; continue; }
        cur += ch;
    }
    items.push(cur.trim());
    return items;
}

function itemValid(item, headings) {
    if (!item) return false;
    if (item === "—") return true;
    if (/^[A-Z][a-z]+( [A-Z][a-z]+)? feature$/.test(item)) return true;
    let base = item.replace(/\s*\([^()]*\)$/, "").trim();
    if (/ improvements?$/.test(base)) {
        const b = base.replace(/ improvements?$/, "");
        return b.split(" and ").every(x => /^[A-Z]/.test(x.trim()));
    }
    const n = norm(base);
    return headings.has(n) || headings.has(n + "s") || headings.has(n.replace(/s$/, ""));
}

function cellValid(cell, headings) {
    const c = cell.trim();
    if (!c || /,$/.test(c)) return false;
    let depth = 0;
    for (const ch of c) { if (ch === "(") depth++; if (ch === ")") depth--; if (depth < 0) return false; }
    if (depth !== 0) return false;
    return splitItems(c).every(it => itemValid(it, headings));
}

/** Segment wrapped lines into exactly n valid cells; the segmentation must be unique. */
function segmentFeatures(lines, n, headings) {
    const m = lines.length;
    if (m < n) return { error: `${m} lines for ${n} rows` };
    // ways[i][k]: number of segmentations of lines[i..] into k cells (capped at 2); first[i][k]: end index of the first cell
    const ways = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    const first = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(-1));
    ways[m][0] = 1;
    for (let i = m - 1; i >= 0; i--) {
        for (let k = 1; k <= n; k++) {
            let count = 0, choice = -1;
            let text = "";
            for (let j = i; j < m; j++) {
                text = j === i ? lines[j] : M.joinLines(text, lines[j]);
                if (cellValid(text, headings) && ways[j + 1][k - 1] > 0) {
                    count += ways[j + 1][k - 1];
                    if (choice < 0) choice = j + 1;
                }
            }
            ways[i][k] = Math.min(count, 2);
            first[i][k] = choice;
        }
    }
    if (ways[0][n] === 0) return { error: `no segmentation of ${m} lines into ${n} cells of printed feature names` };
    if (ways[0][n] > 1) return { error: `ambiguous segmentation of ${m} lines into ${n} cells` };
    const cells = [];
    let i = 0, k = n;
    while (k > 0) {
        const j = first[i][k];
        let text = "";
        for (let q = i; q < j; q++) text = q === i ? lines[q] : M.joinLines(text, lines[q]);
        cells.push(text);
        i = j; k--;
    }
    return { cells };
}

/** Base feature names of a class table (parentheticals stripped, "X feature", "—" and improvements dropped). */
function tableFeatureNames(table, iFeatures) {
    const out = new Map(); // normalised name -> first level
    if (!table) return out;
    table.rows.forEach((row, r) => {
        for (const item of splitItems(row[iFeatures])) {
            if (item === "—" || / feature$/.test(item)) continue;
            let base = item.replace(/\s*\([^()]*\)$/, "").trim();
            if (/ improvements?$/.test(base)) continue;
            const n = norm(base);
            if (!out.has(n)) out.set(n, r + 1);
            if (!out.has(n + "s")) out.set(n + "s", r + 1);
        }
    });
    return out;
}

// "Starting at 2nd level", "When you reach 4th level", "By 7th level", "At 3rd, 5th, 7th, and 9th level": the first ordinal
const LEVEL_RE = /\b(?:at|reach|reaching|by)\s+(\d+)(?:st|nd|rd|th)(?:,?\s+(?:and\s+)?\d+(?:st|nd|rd|th))*\s+levels?\b/i;

function sentenceLevel(paragraphs) {
    for (const p of paragraphs.slice(0, 2)) {
        const m = p.match(LEVEL_RE);
        if (m) return parseInt(m[1], 10);
    }
    return null;
}

function stageClasses(entries, warnings) {
    const flow = M.rangeFlow(8, 55);
    const blocks = M.blocksOf(flow);
    const kinds = blocks.map(M.blockKind);
    const section = "Classes";
    // class headings in order
    // Table resolution splits blocks, which shifts every later block index: locate each class's
    // heading (and the next class's) immediately before processing it.
    let from = 0;
    for (let ci = 0; ci < CLASSES.length; ci++) {
        const spec = CLASSES[ci];
        const h = M.findHeading(blocks, spec.name, from, kinds);
        if (!h) { warnings.push({ page: 8, message: `class heading "${spec.name}" not found` }); continue; }
        const hn = ci + 1 < CLASSES.length ? M.findHeading(blocks, CLASSES[ci + 1].name, h.index + 1, kinds) : null;
        const end = hn ? hn.index : blocks.length;
        stageOneClass(spec, flow, blocks, kinds, h.index, end, entries, warnings, section);
        from = h.index + 1;
    }
}

function stageOneClass(spec, flow, blocks, kinds, start, end, entries, warnings, section) {
    const notes = [];
    const firstPage = blocks[start].pages[0];
    // the class's flow slice for table location: lines of blocks[start..end)
    const flowFrom = flow.indexOf(blocks[start].lines[0]);
    const flowTo = end < blocks.length ? flow.indexOf(blocks[end].lines[0]) : flow.length;
    const classFlow = flow.slice(flowFrom, flowTo);
    // small tables of the class (spell lists, beast shapes ...)
    const hits = resolveTables(spec.tables || [], classFlow, blocks, kinds, warnings, firstPage);
    end += hits.splits; // every split lies inside this class
    // class table region: caption "The <Class>" to the 20th row and its trailing fragment lines
    const capLine = M.findLine(classFlow, `The ${spec.name}`, 0);
    let classTable = null, tableHit = null;
    let headings = new Set();
    for (let i = start; i < end; i++) if (kinds[i] === "heading") headings.add(norm(M.blockText(blocks[i])));
    if (capLine < 0 || classFlow[capLine].text.trim() !== `The ${spec.name}`) {
        warnings.push({ page: firstPage, message: `The ${spec.name}: caption not found` });
        notes.push("missing: classTable (caption not found)");
    } else {
        let k = -1;
        for (let i = capLine + 1; i < classFlow.length; i++) { if (!classFlow[i].brk && /^\s{0,3}20th\b/.test(classFlow[i].text)) { k = i; break; } }
        if (k < 0) { warnings.push({ page: firstPage, message: `The ${spec.name}: 20th row not found` }); notes.push("missing: classTable (20th row not found)"); }
        else {
            let endLine = k + 1;
            while (endLine < classFlow.length && !classFlow[endLine].brk && classFlow[endLine].text.trim() !== "") endLine++;
            // a fragment of the 20th row may follow after a blank line (e.g. "Champion" below "Primal"): take
            // following non-blank lines while they are needed to complete the last cell
            let region = classFlow.slice(capLine, endLine);
            const firstTry = [];
            let table = parseClassTable(region, spec.name, headings, firstTry);
            let extra = 0;
            while (!table && extra < 3) {
                let j = endLine;
                while (j < classFlow.length && (classFlow[j].brk || classFlow[j].text.trim() === "")) j++;
                if (j >= classFlow.length) break;
                endLine = j + 1;
                extra++;
                region = classFlow.slice(capLine, endLine);
                table = parseClassTable(region, spec.name, headings, []);
            }
            if (!table) warnings.push(...firstTry);
            while (endLine < classFlow.length && (classFlow[endLine].brk || classFlow[endLine].text.trim() === "")) endLine++;
            if (table) {
                classTable = table;
                const startLine = classFlow[capLine], stopLine = endLine < classFlow.length ? classFlow[endLine] : null;
                const fromBlock = blocks.findIndex(b => b.lines.includes(startLine));
                let toBlock = stopLine ? blocks.findIndex(b => b.lines.includes(stopLine)) : end;
                if (toBlock < 0) toBlock = end;
                if (stopLine && toBlock >= 0 && blocks[toBlock].lines[0] !== stopLine) {
                    const blk = blocks[toBlock];
                    const cut = blk.lines.indexOf(stopLine);
                    if (cut > 0) {
                        const head = { lines: blk.lines.slice(0, cut), pages: [...new Set(blk.lines.slice(0, cut).map(l => l.page))] };
                        const tail = { lines: blk.lines.slice(cut), pages: [...new Set(blk.lines.slice(cut).map(l => l.page))] };
                        blocks.splice(toBlock, 1, head, tail);
                        kinds.splice(toBlock, 1, M.blockKind(head), M.blockKind(tail));
                        toBlock += 1;
                        end += 1;
                        for (const h of hits) { if (h.fromBlock >= toBlock) { h.fromBlock++; h.toBlock++; } else if (h.toBlock > toBlock) h.toBlock++; }
                    }
                }
                tableHit = { table, fromBlock, toBlock, pages: [...new Set(region.filter(l => !l.brk).map(l => l.page))] };
                hits.push(tableHit);
            } else notes.push("missing: classTable (the layout defeated the table reader; see warnings)");
        }
    }
    // structural marks
    const subclassH = M.findHeading(blocks, spec.subclass, start, kinds);
    if (!subclassH || subclassH.index >= end) { warnings.push({ page: firstPage, message: `${spec.name}: subclass heading "${spec.subclass}" not found` }); }
    const subclassStart = subclassH ? subclassH.index : end;
    let introH = spec.subclassIntro ? M.findHeading(blocks, spec.subclassIntro, start, kinds) : null;
    if (introH && introH.index > subclassStart) introH = null;
    const featuresEnd = introH ? introH.index : subclassStart;
    // sidebars after the subclass
    const sidebarMarks = [];
    for (const sb of spec.sidebars || []) {
        const h = M.findHeading(blocks, sb, subclassStart, kinds);
        if (h && h.index < end) sidebarMarks.push({ name: sb, index: h.index });
        else warnings.push({ page: firstPage, message: `${spec.name}: sidebar heading "${sb}" not found` });
    }
    sidebarMarks.sort((a, b) => a.index - b.index);
    const subclassEnd = sidebarMarks.length ? sidebarMarks[0].index : end;

    // ---- class basics -------------------------------------------------------------------
    const basics = { hitDie: null, savingThrows: null, proficiencies: { armor: null, weapons: null, tools: null, skills: null }, startingEquipment: null, hitPoints: {} };
    const equipmentH = M.findHeading(blocks, "Equipment", start, kinds);
    for (let i = start; i < featuresEnd; i++) {
        if (kinds[i] !== "labels" && kinds[i] !== "prose") continue;
        for (const p of M.blockParagraphs(blocks[i], kinds[i])) {
            let m;
            if ((m = p.match(/^Hit Dice:\s*(\S+)\s+per/))) basics.hitDie = m[1];
            else if ((m = p.match(/^Hit Points at 1st Level:\s*(.+)$/))) basics.hitPoints.level1 = m[1];
            else if ((m = p.match(/^Hit Points at Higher Levels:\s*(.+)$/))) basics.hitPoints.higher = m[1];
            else if ((m = p.match(/^Armor:\s*(.+)$/))) basics.proficiencies.armor = m[1];
            else if ((m = p.match(/^Weapons:\s*(.+)$/))) basics.proficiencies.weapons = m[1];
            else if ((m = p.match(/^Tools:\s*(.+)$/))) basics.proficiencies.tools = m[1];
            else if ((m = p.match(/^Saving Throws:\s*(.+)$/))) basics.savingThrows = m[1].split(/,\s*/);
            else if ((m = p.match(/^Skills:\s*(.+)$/))) basics.proficiencies.skills = m[1];
        }
    }
    if (equipmentH && equipmentH.index < featuresEnd) {
        const items = [];
        for (let i = equipmentH.index + 1; i < featuresEnd; i++) {
            if (kinds[i] === "heading") break;
            if (kinds[i] === "bullets") for (const p of M.blockParagraphs(blocks[i], "bullets")) items.push(p.replace(/^•\s*/, ""));
            if (kinds[i] === "table" && tableHit && i >= tableHit.fromBlock) break;
        }
        if (items.length) basics.startingEquipment = items;
    }

    // ---- features ------------------------------------------------------------------------
    const iFeatures = classTable ? classTable.columns.indexOf("Features") : -1;
    const tableNames = tableFeatureNames(classTable, iFeatures);
    const captionSet = new Set((spec.tables || []).map(t => norm(t.caption)));
    const features = [];
    const featureHeads = [];
    const classFeaturesH = M.findHeading(blocks, "Class Features", start, kinds);
    const featuresFrom = classFeaturesH ? classFeaturesH.index + 1 : start + 1;
    for (let i = featuresFrom; i < featuresEnd; i++) {
        if (kinds[i] !== "heading") continue;
        if (tableHit && i >= tableHit.fromBlock && i < tableHit.toBlock) continue;
        const name = M.blockText(blocks[i]);
        const n = norm(name);
        if (["hit points", "proficiencies", "equipment"].includes(n)) continue;
        if (captionSet.has(n) && !tableNames.has(n)) continue;
        if (tableNames.has(n)) featureHeads.push({ name, index: i });
    }
    for (let f = 0; f < featureHeads.length; f++) {
        const h = featureHeads[f];
        const to = f + 1 < featureHeads.length ? featureHeads[f + 1].index : featuresEnd;
        const r = M.renderBlocks(blocks, kinds, h.index, to, hits, warnings);
        const paras = [];
        for (let i = h.index + 1; i < to && paras.length < 2; i++) if (kinds[i] === "prose") paras.push(...M.blockParagraphs(blocks[i], "prose"));
        const fromSentence = sentenceLevel(paras);
        const fromTable = tableNames.get(norm(h.name)) || null;
        let level = fromSentence;
        if (level === null && fromTable === 1) level = 1;
        const subheadings = [];
        for (let i = h.index + 1; i < to; i++) if (kinds[i] === "heading") subheadings.push(M.blockText(blocks[i]));
        const existing = features.find(x => norm(x.name) === norm(h.name));
        if (existing) {
            // a repeated heading (the Warlock's Eldritch Invocations list) continues the feature
            existing.text += "\n\n" + r.text;
            existing.subheadings.push(...subheadings);
            existing.pages = [...new Set([...existing.pages, ...r.pages])].sort((a, b) => a - b);
            continue;
        }
        const feat = { name: h.name, level, text: r.text, pages: r.pages, subheadings };
        if (fromSentence !== null && fromTable !== null && fromSentence !== fromTable) warnings.push({ page: r.pages[0], message: `${spec.name} feature "${h.name}": sentence says level ${fromSentence}, table row ${fromTable}` });
        if (level === null) { notes.push(`missing: level of feature "${h.name}" (no level sentence; table first lists it at ${fromTable})`); }
        features.push(feat);
    }
    // features named in the table but without a heading
    for (const [n, lvl] of tableNames) {
        if (n.endsWith("s") && tableNames.has(n.slice(0, -1))) continue;
        if (!features.some(f => norm(f.name) === n || norm(f.name) + "s" === n || norm(f.name) === n + "s")) notes.push(`missing: feature heading for table entry "${n}" (level ${lvl})`);
    }

    // ---- class entry text ------------------------------------------------------------------
    const classText = M.renderBlocks(blocks, kinds, start, subclassStart, hits, warnings);
    let text = classText.text;
    let pages = classText.pages.slice();
    for (let s = 0; s < sidebarMarks.length; s++) {
        const to = s + 1 < sidebarMarks.length ? sidebarMarks[s + 1].index : end;
        const r = M.renderBlocks(blocks, kinds, sidebarMarks[s].index, to, hits, warnings);
        text += "\n\n" + r.text;
        pages = [...new Set([...pages, ...r.pages])].sort((a, b) => a - b);
    }
    const classTables = hits.filter(h => h.table && h.fromBlock >= start && h.fromBlock < subclassStart && h !== tableHit).map(h => ({ caption: h.table.caption, columns: h.table.columns, rows: h.table.rows }));
    const data = {
        hitDie: basics.hitDie,
        hitPoints: basics.hitPoints,
        savingThrows: basics.savingThrows,
        proficiencies: basics.proficiencies,
        startingEquipment: basics.startingEquipment,
        classTable: classTable ? { caption: classTable.caption, columns: classTable.columns, rows: classTable.rows } : null,
        features: features.map(f => ({ name: f.name, level: f.level, text: f.text, subheadings: f.subheadings })),
        subclasses: subclassH ? [spec.subclass] : [],
        subclassIntro: spec.subclassIntro,
        sidebars: sidebarMarks.map(s => s.name),
        tables: classTables
    };
    for (const f of ["hitDie", "savingThrows", "startingEquipment"]) if (!data[f]) notes.push(`missing: ${f}`);
    for (const f of ["armor", "weapons", "tools", "skills"]) if (!basics.proficiencies[f]) notes.push(`missing: proficiencies.${f}`);
    entries.push(M.makeEntry({ kind: "class", category: CATEGORY, name: spec.name, pages, section, text, data, notes }));

    // ---- subclass entry ----------------------------------------------------------------------
    if (subclassH) {
        const r = M.renderBlocks(blocks, kinds, subclassStart, subclassEnd, hits, warnings);
        const subNotes = [];
        const subFeatures = [];
        const nonFeature = new Set((spec.nonFeatureSubsections || []).map(norm));
        const heads = [];
        for (let i = subclassStart + subclassH.span; i < subclassEnd; i++) {
            if (kinds[i] !== "heading") continue;
            const name = M.blockText(blocks[i]);
            const n = norm(name);
            if (captionSet.has(n) || nonFeature.has(n)) continue;
            if (hits.some(h => i >= h.fromBlock && i < h.toBlock)) continue;
            heads.push({ name, index: i });
        }
        // The level at which the class grants its subclass: the class feature named by the class
        // table's "<X> feature" rows ("Sacred Oath feature" -> Sacred Oath at 3rd; "Path feature" ->
        // Primal Path at 3rd), read from the parent's feature list. A subclass feature without a level
        // sentence of its own (Oath Spells, Expanded Spell List) belongs to the subclass as a whole
        // and takes this level, recorded as levelBasis "subclass gained at this level".
        let gainedByFeature = null, gainedAtLevel = null;
        if (classTable && iFeatures >= 0) {
            const xs = [];
            for (const row of classTable.rows) for (const item of splitItems(row[iFeatures])) { const m = item.match(/^(.+) feature$/); if (m && !xs.includes(m[1])) xs.push(m[1]); }
            for (const x of xs) {
                const f = features.find(f => f.name === x || f.name.endsWith(" " + x));
                if (f && f.level !== null) { gainedByFeature = f.name; gainedAtLevel = f.level; break; }
            }
        }
        if (gainedAtLevel === null) subNotes.push("missing: level at which the class grants this subclass (no \"<X> feature\" row of the class table matched a class feature)");
        for (let f = 0; f < heads.length; f++) {
            const h = heads[f];
            const to = f + 1 < heads.length ? heads[f + 1].index : subclassEnd;
            const rr = M.renderBlocks(blocks, kinds, h.index, to, hits, warnings);
            const paras = [];
            for (let i = h.index + 1; i < to && paras.length < 2; i++) if (kinds[i] === "prose") paras.push(...M.blockParagraphs(blocks[i], "prose"));
            let level = sentenceLevel(paras);
            let levelBasis = level === null ? null : "feature text";
            if (level === null && gainedAtLevel !== null) { level = gainedAtLevel; levelBasis = "subclass gained at this level"; }
            const subheadings = [];
            for (let i = h.index + 1; i < to; i++) if (kinds[i] === "heading" && !hits.some(x => i >= x.fromBlock && i < x.toBlock)) subheadings.push(M.blockText(blocks[i]));
            if (level === null) subNotes.push(`missing: level of feature "${h.name}" (no level sentence and no subclass level)`);
            subFeatures.push({ name: h.name, level, levelBasis, text: rr.text, subheadings });
        }
        const subTables = hits.filter(h => h.table && h.fromBlock >= subclassStart && h.fromBlock < subclassEnd).map(h => ({ caption: h.table.caption, columns: h.table.columns, rows: h.table.rows }));
        entries.push(M.makeEntry({ kind: "subclass", category: CATEGORY, name: spec.subclass, pages: r.pages, section, text: r.text,
            data: { parentClass: spec.name, gainedAtLevel, gainedByFeature, features: subFeatures, tables: subTables, nonFeatureSubsections: spec.nonFeatureSubsections || [] }, notes: subNotes }));
    }
}

// ============================================================================================
// Beyond 1st Level (56-61) and Feats (75)
// ============================================================================================

const B1L_TABLES = [
    { caption: "Character Advancement", columns: ["Experience Points", "Level", "Proficiency Bonus"], until: "Multiclassing" },
    { caption: "Multiclassing Prerequisites", columns: ["Class", "Ability Score Minimum"], until: "Experience Points" },
    { caption: "Multiclassing Proficiencies", columns: ["Class", "Proficiencies Gained"], until: "Class Features" },
    // printed as a two-line title; single-spaced rows "1st 2 — — — — — — — —"
    { caption: "Multiclass Spellcaster: Spell Slots per Spell Level", locate: "Multiclass Spellcaster:", columns: ["Lvl.", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"],
        headerWords: ["Multiclass Spellcaster:", "Spell Slots per Spell Level"], mode: "words", until: "Alignment" },
    { caption: "Standard Languages", columns: ["Language", "Typical Speakers", "Script"], until: "Exotic Languages" },
    { caption: "Exotic Languages", columns: ["Language", "Typical Speakers", "Script"], until: "Inspiration" },
    { caption: "d8 Personality Trait", columns: ["d8", "Personality Trait"], until: "d6 Ideal", mode: "numbered" },
    { caption: "d6 Ideal", columns: ["d6", "Ideal"], until: "d6 Bond", mode: "numbered" },
    { caption: "d6 Bond", columns: ["d6", "Bond"], until: "d6 Flaw", mode: "numbered" },
    { caption: "d6 Flaw", columns: ["d6", "Flaw"], until: null, mode: "numbered" }
];
const B1L_ENTRIES = ["Multiclassing", "Alignment", "Languages", "Inspiration", "Backgrounds"];

function stageBeyond1stLevel(entries, warnings) {
    const flow = M.rangeFlow(56, 61);
    const blocks = M.blocksOf(flow);
    const kinds = blocks.map(M.blockKind);
    const section = "Beyond 1st Level";
    const hits = resolveTables(B1L_TABLES, flow, blocks, kinds, warnings, 56);
    const h0 = M.findHeading(blocks, "Beyond 1st Level", 0, kinds);
    if (!h0) { warnings.push({ page: 56, message: "chapter heading \"Beyond 1st Level\" not found" }); return; }
    const marks = [];
    let from = h0.index + h0.span;
    for (const name of B1L_ENTRIES) {
        const h = M.findHeading(blocks, name, from, kinds);
        if (!h) { warnings.push({ page: 56, message: `heading "${name}" not found in Beyond 1st Level` }); continue; }
        marks.push({ name, index: h.index });
        from = h.index + 1;
    }
    const acolyte = M.findHeading(blocks, "Acolyte", from, kinds);
    const acolyteIndex = acolyte ? acolyte.index : blocks.length;
    const bounds = [{ name: "Beyond 1st Level", from: h0.index, to: marks.length ? marks[0].index : acolyteIndex, intro: true }];
    for (let i = 0; i < marks.length; i++) bounds.push({ name: marks[i].name, from: marks[i].index, to: i + 1 < marks.length ? marks[i + 1].index : acolyteIndex });
    for (const b of bounds) {
        const r = M.renderBlocks(blocks, kinds, b.from, b.to, hits, warnings);
        const subheadings = [];
        for (let i = b.from + 1; i < b.to; i++) if (kinds[i] === "heading" && !hits.some(h => i >= h.fromBlock && i < h.toBlock)) subheadings.push(M.blockText(blocks[i]));
        const tables = hits.filter(h => h.fromBlock >= b.from && h.fromBlock < b.to && h.table).map(h => ({ caption: h.table.caption, columns: h.table.columns, rows: h.table.rows }));
        const notes = hits.filter(h => h.fromBlock >= b.from && h.fromBlock < b.to && !h.table).map(h => `missing: table "${h.spec.caption}" could not be parsed`);
        entries.push(M.makeEntry({ kind: "rule", category: "rules", name: b.intro ? "Beyond 1st Level" : `Beyond 1st Level: ${b.name}`, heading: b.name, pages: r.pages, section, text: r.text,
            data: { headingPath: b.intro ? ["Beyond 1st Level"] : ["Beyond 1st Level", b.name], subheadings, tables }, notes }));
    }
    // Acolyte background
    if (acolyte) {
        const r = M.renderBlocks(blocks, kinds, acolyte.index, blocks.length, hits, warnings);
        const data = { skillProficiencies: null, languages: null, equipment: null, feature: null, characteristics: [] };
        const notes = [];
        for (let i = acolyte.index; i < blocks.length; i++) {
            if (kinds[i] === "labels" || kinds[i] === "prose") for (const p of M.blockParagraphs(blocks[i], kinds[i])) {
                let m;
                if ((m = p.match(/^Skill Proficiencies:\s*(.+)$/))) data.skillProficiencies = m[1];
                else if ((m = p.match(/^Languages:\s*(.+)$/))) data.languages = m[1];
                else if ((m = p.match(/^Equipment:\s*(.+)$/s))) data.equipment = m[1].replace(/\s+/g, " ");
            }
            if (kinds[i] === "heading") {
                const m = M.blockText(blocks[i]).match(/^Feature:\s*(.+)$/);
                if (m) {
                    let to = i + 1;
                    while (to < blocks.length && kinds[to] !== "heading") to++;
                    const ft = M.renderBlocks(blocks, kinds, i + 1, to, hits, null);
                    data.feature = { name: m[1], text: ft.text };
                }
            }
        }
        data.characteristics = hits.filter(h => h.fromBlock >= acolyte.index && h.table).map(h => ({ caption: h.table.caption, columns: h.table.columns, rows: h.table.rows }));
        for (const f of ["skillProficiencies", "languages", "equipment", "feature"]) if (!data[f]) notes.push(`missing: ${f}`);
        if (data.characteristics.length !== 4) notes.push(`missing: characteristics (${data.characteristics.length} of 4 tables parsed)`);
        entries.push(M.makeEntry({ kind: "background", category: CATEGORY, name: "Acolyte", pages: r.pages, section, text: r.text, data, notes }));
    } else warnings.push({ page: 60, message: "background heading \"Acolyte\" not found" });
}

function stageFeats(entries, warnings) {
    const flow = M.rangeFlow(75, 75);
    const blocks = M.blocksOf(flow);
    const kinds = blocks.map(M.blockKind);
    const section = "Feats";
    const h0 = M.findHeading(blocks, "Feats", 0, kinds);
    const hg = M.findHeading(blocks, "Grappler", 0, kinds);
    if (!h0 || !hg) { warnings.push({ page: 75, message: "Feats or Grappler heading not found on page 75" }); return; }
    const intro = M.renderBlocks(blocks, kinds, h0.index, hg.index, null, warnings);
    entries.push(M.makeEntry({ kind: "rule", category: "rules", name: "Feats", heading: "Feats", pages: intro.pages, section, text: intro.text, data: { headingPath: ["Feats"], subheadings: [], tables: [] } }));
    const r = M.renderBlocks(blocks, kinds, hg.index, blocks.length, null, warnings);
    let prerequisite = null;
    const benefits = [];
    for (let i = hg.index + 1; i < blocks.length; i++) {
        for (const p of M.blockParagraphs(blocks[i], kinds[i])) {
            const m = p.match(/^Prerequisite:\s*(.+)$/);
            if (m) prerequisite = m[1];
            else if (/^•/.test(p)) benefits.push(p.replace(/^•\s*/, ""));
        }
    }
    const notes = [];
    if (!prerequisite) notes.push("missing: prerequisite");
    if (!benefits.length) notes.push("missing: benefits");
    entries.push(M.makeEntry({ kind: "feat", category: CATEGORY, name: "Grappler", pages: r.pages, section, text: r.text, data: { prerequisite, benefits }, notes }));
}

// ============================================================================================
// main
// ============================================================================================

function main() {
    const generator = "tools/srd_extract/stage_character_options.js";
    const warnings = [];
    const entries = [];
    const chk = M.makeChecker();

    stageRaces(entries, warnings);
    stageClasses(entries, warnings);
    stageBeyond1stLevel(entries, warnings);
    stageFeats(entries, warnings);

    for (const e of entries) {
        const req = (REQUIRED[e.kind] || []).filter(f => !((f === "tables" || f === "subraces") && Array.isArray(e.data[f])));
        const missing = M.requiredFieldsMissing(e, req);
        if (missing.length) e.notes.push(`missing: ${missing.join(", ")}`);
        if (e.notes.some(n => /^missing/.test(n))) e.readiness = "extracted";
    }
    const ids = new Map();
    for (const e of entries) ids.set(e.id, (ids.get(e.id) || 0) + 1);
    const dupes = [...ids].filter(([, n]) => n > 1).map(([id]) => id);

    const file = path.join(M.STAGING_DIR, "staging_character_options.json");
    M.writeStaging(file, CATEGORY, CO_PAGES, entries, warnings, generator);

    console.log(`\n== stage_character_options self-check (${entries.length} entries, ${warnings.length} warnings) ==`);
    const counts = M.countBy(entries, "kind");
    const expected = { race: [9, 0], subrace: [4, 0], class: [12, 0], subclass: [12, 0], background: [1, 0], feat: [1, 0] };
    for (const [kind, [exp, tol]] of Object.entries(expected)) {
        const n = counts[kind] || 0;
        chk.check(Math.abs(n - exp) <= tol, `count ${kind}: ${n} (expected ${exp} ± ${tol})`);
    }
    chk.check(dupes.length === 0, `duplicate ids: ${dupes.length ? dupes.join(", ") : "none"}`);
    const emptyText = entries.filter(e => !e.text || !e.text.trim());
    chk.check(emptyText.length === 0, `non-empty text everywhere (${emptyText.map(e => e.id).join(", ") || "ok"})`);
    const badParsed = entries.filter(e => e.readiness === "parsed" && M.requiredFieldsMissing(e, (REQUIRED[e.kind] || []).filter(f => !((f === "tables" || f === "subraces") && Array.isArray(e.data[f])))).length);
    chk.check(badParsed.length === 0, `required fields on every parsed entry (${badParsed.map(e => e.id).join(", ") || "ok"})`);
    const uncovered = M.pageCoverage(entries, CO_PAGES);
    chk.check(uncovered.length === 0, `every page contributes text (uncovered: ${uncovered.join(", ") || "none"})`);
    spotChecks(entries, chk);

    console.log(`counts per kind: ${JSON.stringify(counts)}`);
    console.log(`readiness: ${JSON.stringify(M.countBy(entries, "readiness"))}`);
    console.log(`warnings: ${warnings.length}`);
    for (const e of entries.filter(e => e.readiness === "extracted")) console.log(`  extracted: ${e.id} p.${e.source.pages.join(",")}: ${e.notes.join("; ")}`);
    const moved = M.layoutMoveReport(CO_PAGES);
    console.log(moved ? `raw layout cut: ${moved.moved} lines moved on ${moved.pagesMoved} of ${moved.pages} pages (${moved.perPage.map(p => `${p.page}:${p.moved}`).join(" ")})` : "raw layout cut: pre-normalised layout pages not in the cache, moved-line report skipped");
    console.log(`wrote ${path.relative(path.resolve(__dirname, "..", ".."), file)}`);
    const failed = chk.failed();
    console.log(failed ? `RESULT: FAIL (${failed} check(s) failed)` : "RESULT: PASS");
    process.exit(failed ? 1 : 0);
}

function spotChecks(entries, chk) {
    const byId = new Map(entries.map(e => [e.id, e]));
    const dwarf = byId.get("srd:race:dwarf");
    chk.check(dwarf && dwarf.data.size === "Medium" && dwarf.data.speed === 25 && dwarf.data.traits.length === 11 && dwarf.data.subraces.join() === "Hill Dwarf",
        `spot: Dwarf is Medium, speed 25, 11 traits, subrace Hill Dwarf (got ${dwarf ? `${dwarf.data.size}, ${dwarf.data.speed}, ${dwarf.data.traits.length} traits, ${dwarf.data.subraces.join()}` : "no entry"})`);
    const highElf = byId.get("srd:subrace:high-elf");
    chk.check(highElf && highElf.data.parent === "Elf" && /Intelligence score increases by 1/.test(highElf.data.abilityScoreIncrease || "") && highElf.data.traits.length === 4,
        `spot: High Elf parent Elf, +1 Intelligence, 4 traits (got ${highElf ? `${highElf.data.parent}, ${highElf.data.traits.length} traits` : "no entry"})`);
    const fighter = byId.get("srd:class:fighter");
    const row5 = fighter && fighter.data.classTable && fighter.data.classTable.rows[4];
    chk.check(row5 && row5.join(" | ") === "5th | +3 | Extra Attack", `spot: Fighter table row 5 is "5th | +3 | Extra Attack" (got ${JSON.stringify(row5)})`);
    const extraAttack = fighter && fighter.data.features.find(f => f.name === "Extra Attack");
    chk.check(extraAttack && extraAttack.level === 5, `spot: Fighter's Extra Attack feature is level 5 (got ${extraAttack ? extraAttack.level : "no feature"})`);
    chk.check(fighter && fighter.data.hitDie === "1d10" && fighter.data.savingThrows && fighter.data.savingThrows.join(",") === "Strength,Constitution", `spot: Fighter hit die 1d10, saves Strength and Constitution`);
    const champion = byId.get("srd:subclass:champion");
    chk.check(champion && champion.data.parentClass === "Fighter" && champion.data.features.map(f => f.level).join(",") === "3,7,10,15,18",
        `spot: Champion features at levels 3, 7, 10, 15, 18 (got ${champion ? champion.data.features.map(f => `${f.name}@${f.level}`).join(", ") : "no entry"})`);
    const acolyte = byId.get("srd:background:acolyte");
    chk.check(acolyte && acolyte.data.skillProficiencies === "Insight, Religion" && acolyte.data.feature && acolyte.data.feature.name === "Shelter of the Faithful" && acolyte.data.characteristics.map(t => t.rows.length).join(",") === "8,6,6,6",
        `spot: Acolyte: Insight, Religion; feature Shelter of the Faithful; tables of 8, 6, 6, 6 rows (got ${acolyte ? acolyte.data.characteristics.map(t => t.rows.length).join(",") : "no entry"})`);
    const grappler = byId.get("srd:feat:grappler");
    chk.check(grappler && grappler.data.prerequisite === "Strength 13 or higher" && grappler.data.benefits.length === 2, `spot: Grappler prerequisite Strength 13 or higher, 2 benefits`);
    const bard = byId.get("srd:class:bard");
    const bardRow20 = bard && bard.data.classTable && bard.data.classTable.rows[19];
    chk.check(bardRow20 && bardRow20.slice(-9).join("") === "433332211" && bardRow20[3] === "4" && bardRow20[4] === "22", `spot: Bard table row 20: 4 cantrips, 22 spells, slots 4/3/3/3/3/2/2/1/1 (got ${JSON.stringify(bardRow20)})`);
    const barb = byId.get("srd:class:barbarian");
    const barbRow1 = barb && barb.data.classTable && barb.data.classTable.rows[0];
    chk.check(barbRow1 && barbRow1.join(" | ") === "1st | +2 | Rage, Unarmored Defense | 2 | +2", `spot: Barbarian table row 1 (got ${JSON.stringify(barbRow1)})`);
}

if (require.main === module) main();
