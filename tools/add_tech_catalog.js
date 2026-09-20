// Writes the faction technology data (docs/design/TECH_TREE.md §3) into data/UF_WorldCatalog.json, keeping the file's layout:
//   - a new top-level key "tech" (culture permissions derived from existing culture and plan data, the unlock nodes, texts);
//   - inside "skills" (UF_Skills' key) only these paths: list[building].scope = "faction", start.tradeWeight.building = 0,
//     speech.unlockRemark / unlockMax / unlockMore / factionRemark, chronicle.faction, and a new "unlocks" block.
// Every other key of the catalog, and every other path of "skills", must parse back unchanged (asserted before writing).
// The file is re-read right before writing; if it changed while checking, the tool starts over.
//
// Usage: node tools/add_tech_catalog.js [--file <catalog>] [--dry-run] [--check]
//   --check    recompute the culture permissions from the catalog as it is and print any difference with tech.cultures
//   --dry-run  show what would change, write nothing
// Written 2026-09-19 by Claude Code (VISION V76, V77, V84). Levels, node requirements and ability numbers are first-pass tuning
// of our own; node and ability names are PROPOSALS stored as TEST_ names until the user approves them (AGENTS rule 7).
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const file = path.resolve(opt("--file", path.join(__dirname, "..", "game", "data", "UF_WorldCatalog.json")));
const dryRun = args.includes("--dry-run");
const checkOnly = args.includes("--check");
const TODAY = "2026-09-19";

const stripBom = t => t.replace(/^﻿/, "");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = v => JSON.parse(JSON.stringify(v));

//-----------------------------------------------------------------------------
// Culture permissions (TECH_TREE.md §2.3), derived from the catalog as it is

const SURVIVAL = ["stone_knife", "stone_axe", "stone_pick", "fiber_wrap", "hide_cloak", "cook_meat", "cook_fish", "split_firewood"];
function deriveCultures(c) {
    const objs = Object.fromEntries(c.objects.map(o => [o.id, o]));
    const recipes = Object.fromEntries(c.recipes.list.map(r => [r.id, r]));
    const types = Object.fromEntries(c.items.types.map(t => [t.id, t]));
    const makers = {};
    for (const r of c.recipes.list) for (const o of Object.keys(r.outputs || {})) (makers[o] = makers[o] || []).push(r.id);
    const byTag = tag => c.objects.filter(o => o.build && (o.tags || []).includes(tag)).map(o => o.id);
    const firstOut = r => types[Object.keys(r.outputs || {})[0]] || null;
    const isArmor = r => { const t = firstOut(r); return !!(t && t.armor); };
    const isAmmo = r => { const t = firstOut(r); return !!(t && t.ammo); };
    const buildable = id => !!(objs[id] && objs[id].build);
    const out = {};
    for (const cul of Object.keys(c.cultures).filter(k => k !== "about")) {
        const cu = c.cultures[cul];
        const plan = (cu.plan === "default" || !c.colony.plans[cu.plan]) ? c.colony.plan : c.colony.plans[cu.plan];
        const wall = buildable(cu.wall) ? cu.wall : (buildable(cu.laterWall) ? cu.laterWall : null);
        const B = new Set(["campfire", "stockpile"]), R = new Set(SURVIVAL.filter(id => recipes[id]));
        for (const s of plan) {
            if (s.build && buildable(s.build)) B.add((s.build === "wall_wood" || s.build === "wall_stone") && wall ? wall : s.build);
            if (s.craft && recipes[s.craft]) R.add(s.craft);
        }
        for (const k of ["wall", "laterWall", "door"]) if (buildable(cu[k])) B.add(cu[k]);
        for (const it of (cu.arms && cu.arms.prefer) || []) (makers[it] || []).forEach(r => R.add(r));
        let changed = true;
        while (changed) {
            changed = false;
            const add = r => { if (!R.has(r)) { R.add(r); changed = true; } };
            for (const rid of [...R]) {
                const r = recipes[rid];
                if (r.at) for (const o of byTag(r.at)) if (!B.has(o)) { B.add(o); changed = true; }
                for (const inp of Object.keys(r.inputs || {})) if ((makers[inp] || []).length && !makers[inp].some(x => R.has(x))) add(makers[inp][0]);
                if (isArmor(r)) for (const o of c.recipes.list) if (isArmor(o) && o.labor === r.labor && o.material === r.material) add(o.id);
                if (isAmmo(r)) for (const o of c.recipes.list) if (isAmmo(o) && o.at === r.at && Object.keys(o.inputs || {}).every(i => !(makers[i] || []).length || makers[i].some(x => R.has(x)))) add(o.id);
            }
            for (const b of [...B]) for (const inp of Object.keys((objs[b].build || {}).items || {})) if ((makers[inp] || []).length && !makers[inp].some(x => R.has(x))) add(makers[inp][0]);
        }
        const floors = cu.floor && cu.floor.kind ? [cu.floor.kind] : [];
        out[cul] = { buildings: [...B].sort(), floors, recipes: [...R].sort() };
    }
    return out;
}

//-----------------------------------------------------------------------------
// The data written (TECH_TREE.md §2.4, §2.5, §3)

const NODES = [
    { id: "camp", name: "TEST_Campcraft", root: true, after: [], requires: {},
        permits: { buildings: ["campfire", "stockpile", "floor_straw", "workbench", "weapon_rack", "@wall", "@door"], floors: ["@floor"],
            recipes: ["stone_knife", "stone_axe", "stone_pick", "fiber_wrap", "hide_cloak", "cook_meat", "cook_fish", "split_firewood", "club", "spear_stone"], levels: [], planSteps: [] } },
    { id: "hides", name: "TEST_Hide-working", after: ["camp"], requires: { level: 2, built: { workbench: 1 } },
        permits: { buildings: ["tanning_rack"], recipes: ["leather", "sling", "helmet_leather", "armor_leather", "leggings_leather", "shield_wood"] } },
    { id: "bows", name: "TEST_Bow-making", after: ["camp"], requires: { level: 2, built: { workbench: 1 } },
        permits: { buildings: ["bowyer_bench", "fletcher_bench"], recipes: ["bow_short", "bow_long", "arrows_stone", "arrows_bone"] } },
    { id: "smelting", name: "TEST_Smelting", after: ["camp"], requires: { level: 3, built: { "tag:wall": 6 } },
        permits: { buildings: ["furnace"], recipes: ["charcoal", "bar_copper", "bar_iron"] } },
    { id: "forge", name: "TEST_Forge-work", after: ["smelting"], requires: { level: 3, built: { furnace: 1 } },
        permits: { buildings: ["smithy"], recipes: ["spear_iron", "dagger_iron", "sword_short", "axe_iron", "mace", "arrows_iron"] } },
    { id: "armoury", name: "TEST_Armour-smithing", after: ["forge"], requires: { level: 5, built: { smithy: 1 }, members: { smithing: 10 } },
        permits: { buildings: [], recipes: ["helmet_iron", "shield_iron", "greaves_iron", "mail_iron", "sword_long"] } },
    { id: "stonework", name: "TEST_Stone-building", after: ["camp"], requires: { level: 5, built: { "tag:wall": 12 }, stock: { stone: 20 } },
        permits: { buildings: ["@laterWall", "door_stone"], recipes: [] } }
];
const OVERRIDES = { dwarf: { armoury: { requires: { level: 4, built: { smithy: 1 } } } } };

const TECH_TEXT = {
    chronicle: "{faction} can now {what}.",
    speech: "We can {what} now.",
    speechMax: 2,
    chronicleMax: 6,
    more: "and more",
    menuLocked: "{label} · {needs}",
    notCulture: "{culture} don't {what}",
    notUnlocked: "not unlocked yet: {needs}",
    needsLevel: "needs {skill} {level}",
    qualifies: "{skill} {level}: {names}",
    nobody: "{skill} {level}: nobody yet",
    nothingMore: "Nothing further to unlock yet",
    tags: { wall: "walls", door: "doors", workplace: "workshops", bed: "beds", stockpile: "stockpiles" }
};

const UNLOCKS = {
    about: `Personal level requirements and abilities (VISION V84; UF_Skills, docs/design/TECH_TREE.md §2.5; written ${TODAY} by Claude Code, first-pass tuning of our own). actions: object id -> the level needed in the job type's skill to work it with that action; fish: water kind (water.surface keys) -> fishing level; hunt: species -> hunting level; recipes: recipe id -> the level in the recipe's own skill. A missing row means level 1. abilities: small perks at a skill level; name is a PROPOSAL (TEST_ until approved; the game shows text instead); remark is said aloud at the level-up (V92). Effect kinds: speed (mul on the work rate of jobs; tags = object or floor-material tags; ownRecipes = crafts of the ability's skill), yield (add to the extra-yield chance of jobs), saveInput (chance a finished craft of the skill gives one input back; tags = input item tags), extraOutput (chance of count more of the output; tags = output item tags), fail (mul on the failure chance, used once work timing adds failures), combat (read by UF_Combat). phrases and waterNames build the level-up remark ("I can chop down a broadleaf giant now.").`,
    actions: {
        chop: { oak: 1, birch: 1, pine: 1, fir_snow: 1, palm: 1, dead_tree: 1, stump: 1, tree_savanna: 1, tree_swamp: 1, mangrove: 1, wall_wood: 1, cactus_tall: 5, fruit_tree: 10, fruit_tree_bare: 10, tree_tropical: 15, tree_cursed: 20 },
        mine: { copper_outcrop: 1, ironstone: 1, crystal: 10, gold_outcrop: 20 },
        quarry: { granite_boulder: 1, rubble_pillar: 1, wall_stone: 1 },
        gather: { berry_bush: 1, bush: 1, desert_shrub: 1, snow_bush: 1, grass_tuft: 1, reeds: 1, fern: 1, wild_grain: 1, wheat_wild: 1, fruit_tree: 1, cactus: 5 },
        pick: { rocks_small: 1, gravel: 1, rubble: 1, bones_pile: 1, crystal_small: 5 }
    },
    fish: { fresh: 1, pond: 1, marsh: 5, swamp: 5, brackish: 10, salt: 15, icy: 20, deep: 25, blighted: 30 },
    hunt: null, // every wildlife species at 1, filled from the catalog below
    recipes: { stone_knife: 1, stone_axe: 1, stone_pick: 1, fiber_wrap: 1, hide_cloak: 1, cook_meat: 1, cook_fish: 1, split_firewood: 1,
        charcoal: 1, bar_iron: 1, bar_copper: 5, leather: 1, bow_short: 1, bow_long: 1, arrows_stone: 1, arrows_bone: 5, arrows_iron: 15,
        sling: 5, club: 1, spear_stone: 1, spear_iron: 10, shield_wood: 5, dagger_iron: 1, sword_short: 1, sword_long: 20, axe_iron: 1, mace: 10,
        helmet_leather: 5, armor_leather: 1, leggings_leather: 5, helmet_iron: 15, mail_iron: 25, greaves_iron: 20, shield_iron: 20 },
    phrases: { chop: "chop down {thing}", mine: "mine {thing}", quarry: "quarry {thing}", gather: "gather from {thing}", pick: "pick up {thing}", fish: "fish in {water}", hunt: "hunt {thing}" },
    waterNames: { fresh: "fresh water", pond: "pond water", marsh: "marsh water", swamp: "swamp water", icy: "icy water", brackish: "brackish water", salt: "salt water", deep: "deep water", blighted: "blighted water" },
    abilities: [
        { id: "wc_swing", skill: "woodcutting", level: 30, name: "TEST_Clean_Swing", text: "Chopping 10% faster", remark: "My swing's getting cleaner.", effect: { kind: "speed", jobs: ["chop"], mul: 1.1 } },
        { id: "wc_heartwood", skill: "woodcutting", level: 60, name: "TEST_Heartwood_Eye", text: "More logs when chopping", remark: "I can tell where the good wood is now.", effect: { kind: "yield", jobs: ["chop"], add: 0.1 } },
        { id: "mn_pick", skill: "mining", level: 30, name: "TEST_Steady_Pick", text: "Mining 10% faster", remark: "My pick lands where I want it.", effect: { kind: "speed", jobs: ["mine", "quarry"], mul: 1.1 } },
        { id: "mn_seam", skill: "mining", level: 60, name: "TEST_Seam_Sense", text: "More ore when mining", remark: "I can follow a seam by feel now.", effect: { kind: "yield", jobs: ["mine"], add: 0.1 } },
        { id: "fg_picker", skill: "foraging", level: 20, name: "TEST_Keen_Picker", text: "Gathering 15% faster", remark: "My hands know what to pick.", effect: { kind: "speed", jobs: ["gather", "pick"], mul: 1.15 } },
        { id: "fs_line", skill: "fishing", level: 25, name: "TEST_Patient_Line", text: "Fishing 15% faster", remark: "I've learned to wait for the bite.", effect: { kind: "speed", jobs: ["fish"], mul: 1.15 } },
        { id: "hn_step", skill: "hunting", level: 30, name: "TEST_Quiet_Step", text: "Hunting 15% faster", remark: "I can walk up on game quietly now.", effect: { kind: "speed", jobs: ["hunt"], mul: 1.15 } },
        { id: "ck_heat", skill: "cooking", level: 20, name: "TEST_Even_Heat", text: "Cooking 15% faster", remark: "I've got a feel for the fire now.", effect: [{ kind: "speed", jobs: ["craft"], ownRecipes: true, mul: 1.15 }, { kind: "fail", jobs: ["craft"], ownRecipes: true, mul: 0.5 }] },
        { id: "cr_thrift", skill: "crafting", level: 25, name: "TEST_Thrifty_Hands", text: "Sometimes saves material", remark: "I'm wasting less these days.", effect: { kind: "saveInput", chance: 0.1 } },
        { id: "sm_frugal", skill: "smithing", level: 35, name: "TEST_Frugal_Forge", text: "Sometimes saves a bar", remark: "I don't waste metal any more.", effect: { kind: "saveInput", chance: 0.1, tags: ["metal"] } },
        { id: "fl_straight", skill: "fletching", level: 30, name: "TEST_Straight_Fletching", text: "Sometimes 2 extra arrows", remark: "My arrows come out straighter.", effect: { kind: "extraOutput", chance: 0.15, count: 2, tags: ["ammo"] } },
        { id: "lw_cut", skill: "leatherwork", level: 25, name: "TEST_Clean_Cut", text: "Sometimes saves leather", remark: "I cut leather cleaner now.", effect: { kind: "saveInput", chance: 0.1, tags: ["leather", "hide"] } },
        { id: "cp_pace", skill: "carpentry", level: 25, name: "TEST_Joiners_Pace", text: "Wooden building 10% faster", remark: "I can join timber faster now.", effect: { kind: "speed", jobs: ["build", "floor"], tags: ["wood"], mul: 1.1 } },
        { id: "ms_plumb", skill: "masonry", level: 25, name: "TEST_Plumb_Line", text: "Stone building 10% faster", remark: "I lay stone truer now.", effect: { kind: "speed", jobs: ["build", "floor"], tags: ["stone"], mul: 1.1 } },
        { id: "at_thrust", skill: "attack", level: 40, name: "TEST_Twin_Thrust", text: "Every 4th stab aims twice", remark: "I've found a better way to thrust.", effect: { kind: "combat", attackType: "stab", every: 4, effect: "accuracyTwice", value: 1 } },
        { id: "st_weight", skill: "strength", level: 40, name: "TEST_Crushing_Weight", text: "Every 5th crushing blow hits harder", remark: "I can put my weight behind a blow now.", effect: { kind: "combat", attackType: "crush", every: 5, effect: "maxHitMul", value: 1.1 } },
        { id: "rg_draw", skill: "ranged", level: 40, name: "TEST_Steady_Draw", text: "Every 5th shot aims twice", remark: "My draw is steadier now.", effect: { kind: "combat", attackType: "ranged", every: 5, effect: "accuracyTwice", value: 1 } }
    ]
};

function makeTech(c) {
    const derived = deriveCultures(c);
    const cultures = {};
    for (const k of Object.keys(derived)) {
        cultures[k] = Object.assign({}, derived[k], { rule: `derived ${TODAY} (TECH_TREE.md §2.3)`, overrides: clone(OVERRIDES[k] || {}) });
    }
    return {
        about: `Faction technology (VISION V76, V77, V84; UF_Tech, docs/systems/UF_Tech.md, docs/design/TECH_TREE.md; written ${TODAY} by Claude Code with tools/add_tech_catalog.js). cultures: what each culture may ever build (object ids with build), lay (floor kinds) and make (recipe ids); derived from its plan, wall, later wall, door, floor, preferred arms and what those need (TECH_TREE §2.3), plain data the user may edit; overrides[nodeId] replaces keys of that node for the culture. nodes: the unlock tree shared by all cultures; a node gives a faction its permits intersected with the culture's lists; @wall, @door, @laterWall and @floor mean the culture's own (@wall falls back to laterWall when the culture wall can't be built). requires (all must hold): level = the faction's Building level (the skills pool); built = completed structures, { objectId | "tag:x" | floorKind: n or { count, z: [lo, hi] } }; members = { skillId: level or { level, count } }; stock = { itemId: n } held by the faction; classes = { classId: { tier, count } } (UF_Classes); after = node ids. Unlocks are permanent. Node names are PROPOSALS (TEST_ until the user approves them); the game names a node by what it gives. Ids no culture list and no node mention are not gated (and fail the tech.catalog_valid check).`,
        cultures,
        nodes: clone(NODES),
        text: clone(TECH_TEXT),
        chronicle: { who: "all" },
        stockEveryHours: 1,
        keys: { unlocks: 85 }
    };
}

function makeUnlocks(c) {
    const u = clone(UNLOCKS);
    u.hunt = Object.fromEntries(c.wildlife.species.map(s => [s.id, 1]));
    return u;
}

//-----------------------------------------------------------------------------
// Rendering (the catalog's own style: one entry per line inside lists, short objects inline)

function inline(v) {
    if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
    if (v && typeof v === "object") {
        const keys = Object.keys(v);
        return keys.length ? `{ ${keys.map(k => `${JSON.stringify(k)}: ${inline(v[k])}`).join(", ")} }` : "{}";
    }
    return JSON.stringify(v);
}
function renderBlock(obj, indent, nl, expand) {
    // expand: keys whose object value gets one line per sub-key; arrays of objects get one line per entry.
    const pad = " ".repeat(indent), keys = Object.keys(obj), lines = ["{"];
    keys.forEach((k, i) => {
        const comma = i < keys.length - 1 ? "," : "";
        const v = obj[k];
        if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object") {
            lines.push(`${pad}  ${JSON.stringify(k)}: [`);
            v.forEach((e, j) => lines.push(`${pad}    ${inline(e)}${j < v.length - 1 ? "," : ""}`));
            lines.push(`${pad}  ]${comma}`);
        } else if (v && typeof v === "object" && !Array.isArray(v) && expand.includes(k)) {
            const sub = Object.keys(v);
            lines.push(`${pad}  ${JSON.stringify(k)}: {`);
            sub.forEach((s, j) => lines.push(`${pad}    ${JSON.stringify(s)}: ${inline(v[s])}${j < sub.length - 1 ? "," : ""}`));
            lines.push(`${pad}  }${comma}`);
        } else {
            lines.push(`${pad}  ${JSON.stringify(k)}: ${inline(v)}${comma}`);
        }
    });
    lines.push(`${pad}}`);
    return lines.join(nl);
}

// The balanced value text starting at the "{" or "[" at index open.
function valueEnd(text, open) {
    let depth = 0, inStr = false;
    for (let j = open; j < text.length; j++) {
        const ch = text[j];
        if (inStr) { if (ch === "\\") j++; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true;
        else if (ch === "{" || ch === "[") depth++;
        else if ((ch === "}" || ch === "]") && --depth === 0) return j;
    }
    throw new Error("unbalanced value");
}
// [start, end] of the value of a key at a given indent inside [from, to).
function findKey(text, key, indent, from, to) {
    const needle = `\n${" ".repeat(indent)}${JSON.stringify(key)}: `;
    const at = text.indexOf(needle, from);
    if (at < 0 || at >= to) return null;
    const vs = at + needle.length;
    const ch = text[vs];
    if (ch === "{" || ch === "[") return { keyAt: at + 1, start: vs, end: valueEnd(text, vs) };
    let j = vs;
    if (ch === '"') { j++; while (text[j] !== '"') { if (text[j] === "\\") j++; j++; } return { keyAt: at + 1, start: vs, end: j }; }
    while (j < text.length && !/[,\r\n}]/.test(text[j])) j++;
    return { keyAt: at + 1, start: vs, end: j - 1 };
}

//-----------------------------------------------------------------------------
// Build the new text

function build(text) {
    const before = JSON.parse(stripBom(text));
    const nl = text.includes("\r\n") ? "\r\n" : "\n";
    if (!before.skills || !Array.isArray(before.skills.list)) throw new Error('no "skills" key: run tools/add_skills_catalog.js first');
    const tech = makeTech(before), unlocks = makeUnlocks(before);
    let out = text;
    const notes = [];
    const sk = findKey(out, "skills", 2, 0, out.length);
    if (!sk) throw new Error('could not find "skills" at 2 spaces');
    // Edits inside skills, from the last to the first so earlier offsets stay valid.
    const edits = [];
    const skText = out.slice(sk.start, sk.end + 1);
    // 1. list[building].scope
    const bLine = skText.match(/\n {6}\{ "id": "building", [^\n]*\}/);
    if (!bLine) throw new Error("building entry not found on one line in skills.list");
    if (!/"scope": "faction"/.test(bLine[0])) edits.push({ at: sk.start + bLine.index, len: bLine[0].length, text: bLine[0].replace('"kind": "trade", ', '"kind": "trade", "scope": "faction", ') });
    // 2. start.tradeWeight.building
    const tw = findKey(out, "tradeWeight", 6, sk.start, sk.end);
    if (!tw) throw new Error("start.tradeWeight not found");
    const twVal = JSON.parse(out.slice(tw.start, tw.end + 1));
    if (twVal.building !== 0) { twVal.building = 0; edits.push({ at: tw.start, len: tw.end + 1 - tw.start, text: inline(twVal) }); }
    // 3. chronicle.faction
    const ch = findKey(out, "chronicle", 4, sk.start, sk.end);
    const chVal = JSON.parse(out.slice(ch.start, ch.end + 1));
    const faction = { every: 1, who: "all", text: "{faction} reached {skill} level {level}." };
    if (!same(chVal.faction, faction)) { chVal.faction = faction; edits.push({ at: ch.start, len: ch.end + 1 - ch.start, text: inline(chVal) }); }
    // 4. speech templates
    const sp = findKey(out, "speech", 4, sk.start, sk.end);
    const spVal = JSON.parse(out.slice(sp.start, sp.end + 1));
    const spAdd = { unlockRemark: "I can {unlocks} now.", unlockMax: 2, unlockMore: "and more", factionRemark: "We're getting better at {skilllower}." };
    const spNew = Object.assign({}, spVal, spAdd);
    const unlocksText = renderBlock(unlocks, 4, nl, ["actions"]);
    const ul = findKey(out, "unlocks", 4, sk.start, sk.end);
    if (!same(spVal, spNew)) edits.push({ at: sp.start, len: sp.end + 1 - sp.start, text: inline(spNew) + (ul ? "" : `,${nl}    "unlocks": ${unlocksText}`) });
    else if (!ul) edits.push({ at: sp.end + 1, len: 0, text: `,${nl}    "unlocks": ${unlocksText}` });
    if (ul && !same(JSON.parse(out.slice(ul.start, ul.end + 1)), unlocks)) edits.push({ at: ul.start, len: ul.end + 1 - ul.start, text: unlocksText });
    if (ul && !same(spVal, spNew) && !/\n    "unlocks"/.test(out.slice(sp.end, sp.end + 20))) notes.push("unlocks is not right after speech (kept where it is)");
    edits.sort((a, b) => b.at - a.at);
    for (const e of edits) out = out.slice(0, e.at) + e.text + out.slice(e.at + e.len);
    // tech: replace or append at the end
    const techText = renderBlock(tech, 2, nl, ["text", "chronicle", "keys"]).replace(/\n    "cultures": \{[^\n]*\}/, () => {
        const lines = Object.keys(tech.cultures).map((k, i, a) => `      ${JSON.stringify(k)}: ${inline(tech.cultures[k])}${i < a.length - 1 ? "," : ""}`);
        return `${nl}    "cultures": {${nl}${lines.join(nl)}${nl}    }`;
    });
    const tk = findKey(out, "tech", 2, 0, out.length);
    if (tk) {
        if (!same(JSON.parse(out.slice(tk.start, tk.end + 1)), tech)) out = out.slice(0, tk.start) + techText + out.slice(tk.end + 1);
    } else {
        const end = out.lastIndexOf("}");
        let i = end - 1;
        while (i >= 0 && /\s/.test(out[i])) i--;
        out = out.slice(0, i + 1) + "," + nl + '  "tech": ' + techText + out.slice(i + 1);
    }
    // Checks: every other key identical; inside skills only the named paths changed.
    const after = JSON.parse(stripBom(out));
    const problems = [];
    const keysBefore = Object.keys(before).filter(k => k !== "tech"), keysAfter = Object.keys(after).filter(k => k !== "tech");
    if (!same(keysBefore, keysAfter)) problems.push(`other keys ${keysBefore.join(",")} -> ${keysAfter.join(",")}`);
    for (const k of keysBefore) if (k !== "skills" && !same(before[k], after[k])) problems.push(`key "${k}" changed`);
    const s0 = clone(before.skills), s1 = clone(after.skills);
    for (const s of [s0, s1]) {
        const b = s.list.find(e => e.id === "building");
        if (b) delete b.scope;
        if (s.start && s.start.tradeWeight) delete s.start.tradeWeight.building;
        if (s.chronicle) delete s.chronicle.faction;
        if (s.speech) for (const k of Object.keys(spAdd)) delete s.speech[k];
        delete s.unlocks;
    }
    if (!same(s0, s1)) problems.push("a path of skills other than the named ones changed");
    if (!same(after.tech, tech)) problems.push("tech differs from the script's");
    if (!same(after.skills.unlocks, unlocks)) problems.push("skills.unlocks differs from the script's");
    if (after.skills.list.find(e => e.id === "building").scope !== "faction") problems.push("building scope not written");
    return { before, after, out, problems, notes, changed: out !== text, tech };
}

//-----------------------------------------------------------------------------

if (checkOnly) {
    const c = JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
    const now = deriveCultures(c);
    const have = (c.tech && c.tech.cultures) || {};
    let diffs = 0;
    for (const k of new Set(Object.keys(now).concat(Object.keys(have)))) {
        for (const list of ["buildings", "floors", "recipes"]) {
            const a = new Set((have[k] && have[k][list]) || []), b = new Set((now[k] && now[k][list]) || []);
            const add = [...b].filter(x => !a.has(x)), gone = [...a].filter(x => !b.has(x));
            if (add.length || gone.length) { diffs++; console.log(`${k}.${list}: derived now adds [${add.join(", ")}] and drops [${gone.join(", ")}]`); }
        }
    }
    console.log(diffs ? `${diffs} difference(s) between tech.cultures and the rule applied to today's catalog` : "tech.cultures equals the rule applied to today's catalog");
    process.exit(diffs ? 1 : 0);
}

for (let attempt = 1; attempt <= 3; attempt++) {
    const text = fs.readFileSync(file, "utf8");
    const r = build(text);
    if (r.problems.length) {
        console.error(`CHECK FAILED, nothing written: ${r.problems.join("; ")}`);
        process.exit(1);
    }
    if (!r.changed) {
        console.log(`${file}: tech and the skills paths are already as the script writes them`);
        process.exit(0);
    }
    if (dryRun) {
        console.log(`dry run: would write ${r.out.length - text.length} more bytes to ${file}; ${Object.keys(r.before).length} keys before, tech ${r.before.tech ? "replaced" : "added"}${r.notes.length ? "; " + r.notes.join("; ") : ""}`);
        for (const k of Object.keys(r.tech.cultures)) console.log(`  ${k}: ${r.tech.cultures[k].buildings.length} buildings, ${r.tech.cultures[k].floors.join("/")}, ${r.tech.cultures[k].recipes.length} recipes`);
        process.exit(0);
    }
    const again = fs.readFileSync(file, "utf8");
    if (again !== text) {
        console.log(`attempt ${attempt}: the file changed while checking; starting over`);
        continue;
    }
    fs.writeFileSync(file, r.out);
    const written = JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
    const others = Object.keys(r.before).filter(k => k !== "tech" && k !== "skills");
    const ok = same(written.tech, r.tech) && others.every(k => same(r.before[k], written[k])) && same(written.skills, r.after.skills);
    console.log(`${ok ? "WROTE" : "WRITTEN BUT CHECK FAILED"} ${file}: tech ${r.before.tech ? "replaced" : "added"} (${Object.keys(r.tech.cultures).length} cultures, ${r.tech.nodes.length} nodes), skills paths updated; ${others.length} other keys unchanged: ${ok}`);
    process.exit(ok ? 0 : 1);
}
console.error("the file kept changing; nothing written");
process.exit(1);
