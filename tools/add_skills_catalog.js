// Adds the top-level "skills" key (UF_Skills, VISION V63 and V64) to the world catalog without touching anything else.
// The file's text is kept as it is: the key is inserted before the root object's closing brace (2-space indent, one
// skill per line in skills.list), and the script checks that every other key parses to exactly the same value
// before it writes. It re-reads the file right before writing and starts over if another agent changed it in
// between. An existing "skills" key is replaced only with --replace (the same checks apply to every other key).
//
// Usage: node tools/add_skills_catalog.js [--file <catalog.json>] [--dry-run] [--replace]
//   default file: game/data/UF_WorldCatalog.json
// Exit code: 0 written or already identical, 1 a check failed (nothing written).
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
const replace = args.includes("--replace");

const SKILLS = {
    about: "Skills that grow by doing (VISION V63, V64; UF_Skills, docs/systems/UF_Skills.md; written 2026-09-19 by Claude Code). Levels 1-99; xp for level L = floor(sum over i = 1..L-1 of floor(i + 300 * 2^(i/7)) / 4): level 2 = 83, 10 = 1154, 50 = 101333, 92 = 6517253, 99 = 13034431; xp stops at maxXp. list: kind trade or combat; jobs = the job types whose jobs:done trains it (hunting is trained by jobs:kill); recipeSkills / recipeAt = the craft recipes it covers (recipes.list[].skill, then .at; any other recipe trains the skill with craftDefault); buildTags = a build job of an object with one of these tags also gives this skill xp.buildShare of the building xp; xp = { base, perWork }: one job gives base + perWork x min(the job's work in ticks, xp.workCap). noSkill = job types that train nothing. effects: work rate x (1 + (level - 1) x speedPerLevel); extraYield: on jobs:done of these job types a seeded chance of level x chancePerLevel of one more of the first yield on the job's cell; quality (0-max) = floor((level - 1) x perLevel + roll x spread). combatXp: xp per damage point dealt, by attack type (melee = stab, slash, crush) and style, plus hitpointsPerDamage. start: starting levels when a person appears, by life stage (stageAges, else defaultStage), species (favoured skills roll twice and keep the higher) and culture (a trade's weight = tradeWeight x (the culture's highest priority among the trade's jobs, or craft for recipe skills, x its highest chainWeight among the labors that train it) ^ cultureExponent). oldRecord: a data.skills record (0-20) from a save made before skills becomes levels 1 + round(points x levelPerPoint). chronicle: milestone levels written to the chronicle, and the line when someone whose total level is above deathMinTotal dies. speech: the line shown over the head at a level-up.",
    maxLevel: 99,
    maxXp: 200000000,
    list: [
        { id: "woodcutting", name: "Woodcutting", kind: "trade", jobs: ["chop"], recipeSkills: ["woodcutting"], xp: { base: 5, perWork: 0.1 } },
        { id: "mining", name: "Mining", kind: "trade", jobs: ["mine", "quarry", "dig"], xp: { base: 5, perWork: 0.1 } },
        { id: "fishing", name: "Fishing", kind: "trade", jobs: ["fish"], xp: { base: 10, perWork: 0.1 } },
        { id: "hunting", name: "Hunting", kind: "trade", jobs: ["hunt"], xp: { base: 10, perWork: 0.15 } },
        { id: "foraging", name: "Foraging", kind: "trade", jobs: ["gather", "pick"], xp: { base: 2, perWork: 0.1 } },
        { id: "farming", name: "Farming", kind: "trade", jobs: [], xp: { base: 5, perWork: 0.1 } },
        { id: "cooking", name: "Cooking", kind: "trade", jobs: [], recipeSkills: ["cooking"], recipeAt: ["fire"], xp: { base: 10, perWork: 0.1 } },
        { id: "crafting", name: "Crafting", kind: "trade", jobs: [], recipeSkills: ["crafting", "stonework"], craftDefault: true, xp: { base: 5, perWork: 0.1 } },
        { id: "smithing", name: "Smithing", kind: "trade", jobs: [], recipeSkills: ["smithing", "smelting"], recipeAt: ["furnace", "smithy"], xp: { base: 15, perWork: 1 } },
        { id: "fletching", name: "Fletching", kind: "trade", jobs: [], recipeSkills: ["fletching", "bowyery"], recipeAt: ["fletcher", "bowyer"], xp: { base: 10, perWork: 1 } },
        { id: "carpentry", name: "Carpentry", kind: "trade", jobs: [], recipeSkills: ["carpentry"], buildTags: ["wood"], xp: { base: 10, perWork: 1 } },
        { id: "masonry", name: "Masonry", kind: "trade", jobs: [], recipeSkills: ["masonry"], buildTags: ["stone"], xp: { base: 10, perWork: 0.1 } },
        { id: "building", name: "Building", kind: "trade", jobs: ["build", "dismantle", "floor"], xp: { base: 5, perWork: 0.1 } },
        { id: "leatherwork", name: "Leatherwork", kind: "trade", jobs: [], recipeSkills: ["leatherwork", "tanning"], recipeAt: ["tannery"], xp: { base: 10, perWork: 1 } },
        { id: "healing", name: "Healing", kind: "trade", jobs: [], xp: { base: 10, perWork: 0.1 } },
        { id: "hauling", name: "Hauling", kind: "trade", jobs: ["haul", "fetch", "douse"], xp: { base: 2, perWork: 0.05 } },
        { id: "attack", name: "Attack", kind: "combat" },
        { id: "strength", name: "Strength", kind: "combat" },
        { id: "defence", name: "Defence", kind: "combat" },
        { id: "ranged", name: "Ranged", kind: "combat" },
        { id: "magic", name: "Magic", kind: "combat" },
        { id: "hitpoints", name: "Hitpoints", kind: "combat" }
    ],
    noSkill: ["move", "wander", "equip", "drink", "eat", "sleep", "talk", "mate"],
    xp: { workCap: 600, buildShare: 0.5 },
    effects: {
        speedPerLevel: 0.01,
        extraYield: { jobs: ["gather", "chop", "mine", "quarry", "fish", "hunt"], chancePerLevel: 0.005 },
        quality: { perLevel: 0.0357, spread: 2.5, max: 5 }
    },
    combatXp: {
        hitpointsPerDamage: 1.33,
        melee: { accurate: { attack: 4 }, aggressive: { strength: 4 }, defensive: { defence: 4 }, controlled: { attack: 1.33, strength: 1.33, defence: 1.33 } },
        ranged: { accurate: { ranged: 4 }, rapid: { ranged: 4 }, longrange: { ranged: 2, defence: 2 } },
        magic: { accurate: { magic: 2 }, rapid: { magic: 2 }, longrange: { magic: 1.33, defence: 1 } },
        fallback: { melee: "accurate", ranged: "accurate", magic: "accurate" }
    },
    start: {
        stageAges: { baby: 1, child: 12, teen: 18, elder: 60 },
        defaultStage: "adult",
        stages: {
            baby: { trades: [0, 0], tradeLevel: [1, 1], combat: [1, 1], magic: [1, 1], hitpoints: [10, 10] },
            child: { trades: [0, 0], tradeLevel: [1, 1], combat: [1, 1], magic: [1, 1], hitpoints: [10, 10] },
            teen: { trades: [1, 2], tradeLevel: [3, 12], combat: [1, 6], magic: [1, 1], hitpoints: [10, 12] },
            adult: { trades: [2, 3], tradeLevel: [5, 30], combat: [1, 15], magic: [1, 3], hitpoints: [10, 15] },
            elder: { trades: [2, 3], tradeLevel: [20, 45], combat: [1, 12], magic: [1, 3], hitpoints: [10, 15] }
        },
        hitpointsMin: 10,
        tradeWeight: { farming: 0.5, healing: 0.5, hauling: 0.5 },
        cultureExponent: 2,
        favoured: { human: [], elf: ["ranged"], dwarf: ["defence", "hitpoints"], gnome: ["magic"], goblin: ["ranged"], orc: ["strength", "attack"], automaton: ["defence", "hitpoints"] }
    },
    oldRecord: {
        levelPerPoint: 4.9,
        map: { woodcutting: ["woodcutting"], gathering: ["foraging"], foraging: ["foraging"], stonework: ["mining"], building: ["building"], hauling: ["hauling"], hunting: ["hunting"], crafting: ["crafting"], cooking: ["cooking"], smelting: ["smithing"], smithing: ["smithing"], bowyery: ["fletching"], fletching: ["fletching"], tanning: ["leatherwork"], leatherwork: ["leatherwork"], carpentry: ["carpentry"], fighting: ["attack", "strength", "defence"], archery: ["ranged"] }
    },
    chronicle: { levels: [10, 25, 50, 75, 99], who: "all", deathMinTotal: 80, deathBest: 3, deathExclude: ["hitpoints"] },
    speech: { text: "{skill} level {level}", kind: "thought", barkFrames: 180 }
};

const stripBom = t => t.replace(/^﻿/, "");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// One line, spaced like the rest of the catalog: { "id": "x", "jobs": ["a", "b"] }
function inline(v) {
    if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
    if (v && typeof v === "object") {
        const keys = Object.keys(v);
        return keys.length ? `{ ${keys.map(k => `${JSON.stringify(k)}: ${inline(v[k])}`).join(", ")} }` : "{}";
    }
    return JSON.stringify(v);
}
// skills at 2 spaces; its keys at 4; the list, start.stages and the combat tables one entry per line.
function render(nl) {
    const lines = [];
    const keys = Object.keys(SKILLS);
    lines.push("{");
    keys.forEach((k, i) => {
        const comma = i < keys.length - 1 ? "," : "";
        const v = SKILLS[k];
        if (Array.isArray(v) && v.length && typeof v[0] === "object") {
            lines.push(`    ${JSON.stringify(k)}: [`);
            v.forEach((e, j) => lines.push(`      ${inline(e)}${j < v.length - 1 ? "," : ""}`));
            lines.push(`    ]${comma}`);
        } else if (v && typeof v === "object" && !Array.isArray(v) && ["effects", "combatXp", "start"].includes(k)) {
            lines.push(`    ${JSON.stringify(k)}: {`);
            const sub = Object.keys(v);
            sub.forEach((s, j) => {
                const c2 = j < sub.length - 1 ? "," : "";
                if (k === "start" && s === "stages") {
                    const st = Object.keys(v[s]);
                    lines.push(`      "stages": {`);
                    st.forEach((n, m) => lines.push(`        ${JSON.stringify(n)}: ${inline(v[s][n])}${m < st.length - 1 ? "," : ""}`));
                    lines.push(`      }${c2}`);
                } else lines.push(`      ${JSON.stringify(s)}: ${inline(v[s])}${c2}`);
            });
            lines.push(`    }${comma}`);
        } else {
            lines.push(`    ${JSON.stringify(k)}: ${inline(v)}${comma}`);
        }
    });
    lines.push("  }");
    return lines.join(nl);
}

function build(text) {
    const before = JSON.parse(stripBom(text));
    const has = Object.prototype.hasOwnProperty.call(before, "skills");
    if (has && same(before.skills, SKILLS)) return { identical: true, before };
    if (has && !replace) return { present: true, before };
    const nl = text.includes("\r\n") ? "\r\n" : "\n";
    let out;
    if (!has) {
        const end = text.lastIndexOf("}");
        if (end < 0) throw new Error("no closing brace");
        let i = end - 1;
        while (i >= 0 && /\s/.test(text[i])) i--;
        out = text.slice(0, i + 1) + "," + nl + '  "skills": ' + render(nl) + text.slice(i + 1);
    } else {
        // Replace the existing value: it starts at `  "skills": {` and is the balanced object after it.
        const start = text.indexOf('\n  "skills": ');
        if (start < 0) throw new Error('could not find the "skills" key at 2 spaces');
        const open = text.indexOf("{", start);
        let depth = 0, j = open, inStr = false;
        for (; j < text.length; j++) {
            const ch = text[j];
            if (inStr) { if (ch === "\\") j++; else if (ch === '"') inStr = false; continue; }
            if (ch === '"') inStr = true;
            else if (ch === "{") depth++;
            else if (ch === "}" && --depth === 0) break;
        }
        out = text.slice(0, open) + render(nl) + text.slice(j + 1);
    }
    const after = JSON.parse(stripBom(out));
    const problems = [];
    const keysBefore = Object.keys(before).filter(k => k !== "skills"), keysAfter = Object.keys(after).filter(k => k !== "skills");
    if (!same(keysBefore, keysAfter)) problems.push(`other keys ${keysBefore.length} -> ${keysAfter.length}`);
    for (const k of keysBefore) if (!same(before[k], after[k])) problems.push(`key "${k}" changed`);
    if (!same(after.skills, SKILLS)) problems.push("skills value differs from the script's");
    return { before, after, out, problems, replaced: has };
}

for (let attempt = 1; attempt <= 3; attempt++) {
    const text = fs.readFileSync(file, "utf8");
    const r = build(text);
    if (r.identical) {
        console.log(`${file}: "skills" already present and identical (${r.before.skills.list.length} skills)`);
        process.exit(0);
    }
    if (r.present) {
        console.error(`${file}: a different "skills" key is already there; run with --replace to replace it. Nothing written.`);
        process.exit(1);
    }
    if (r.problems.length) {
        console.error(`CHECK FAILED, nothing written: ${r.problems.join("; ")}`);
        process.exit(1);
    }
    if (dryRun) {
        console.log(`dry run: would ${r.replaced ? "replace" : "add"} "skills" (${r.out.length - text.length} bytes) in ${file}; ${Object.keys(r.before).length} other keys unchanged`);
        process.exit(0);
    }
    const again = fs.readFileSync(file, "utf8");
    if (again !== text) {
        console.log(`attempt ${attempt}: the file changed while checking; starting over`);
        continue;
    }
    fs.writeFileSync(file, r.out);
    const written = JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
    const others = Object.keys(r.before).filter(k => k !== "skills");
    const ok = same(written.skills, SKILLS) && others.every(k => same(r.before[k], written[k]));
    console.log(`${ok ? "WROTE" : "WRITTEN BUT CHECK FAILED"} ${file}: "skills" ${r.replaced ? "replaced" : "added"} (${SKILLS.list.length} skills); ${others.length} other keys unchanged: ${ok}`);
    process.exit(ok ? 0 : 1);
}
console.error("the file kept changing; nothing written");
process.exit(1);
