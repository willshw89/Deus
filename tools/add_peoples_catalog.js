// Adds the five new peoples of VISION V87 (user 2026-09-19 13:42) to data/UF_WorldCatalog.json, from
// docs/design/PEOPLES.md (as corrected by its review). Written 2026-09-19 by Claude Code (the peoples data run).
//
// Text-based and layout-preserving: the catalog is re-read immediately before it is written back, new entries go in
// as one line each like their neighbours, and only these keys change:
//   people.about                         rewritten (documents the new blocks)
//   people.<existing 7>                  a "size" block appended to each line (ART_STANDARD §2; PEOPLES §6), and
//                                        people.dwarf a "habitat" block (favourLevel -1, PEOPLES §3.3, PE23)
//   people.lizardfolk ... people.swarm   appended (PEOPLES §3.7-§3.11, §8.2)
//   factions.about                       one sentence replaced (the playable rule, weight 0)
//   factions.species                     automaton: weight 1 -> 0 and its about (PEOPLES §4, PE5); five entries appended (§8.1)
//   factions.speciesAffinity             the new pairs of PEOPLES §5 appended (PE10)
//   factions.areas                       cursedOk ["undead"], new preferAlignment { undead: "cursed" }, about extended (PE13)
//   sites.preferredBiomes                five entries appended (PEOPLES §8.4)
//   cultures.lizardfolk ... swarm        appended (PEOPLES §3.7-§3.11)
// Everything else must parse to exactly what it was; the tool checks that after editing and before writing, and
// refuses (exit 1) otherwise. Running it again on an edited catalog changes nothing ("already there").
//
// Usage: "C:\Program Files\nodejs\node.exe" tools/add_peoples_catalog.js [--game <game folder>] [--check]
//   --game   the game folder whose data/UF_WorldCatalog.json is edited (default: game/ next to tools/)
//   --check  report whether the catalog holds exactly this data; write nothing (exit 1 if it doesn't)
// Exit code: 0 done or already there, 1 not safe to edit / differs (--check), 2 bad arguments.
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const checkOnly = args.includes("--check");
const file = path.join(gameDir, "data", "UF_WorldCatalog.json");

//-----------------------------------------------------------------------------
// The data (PEOPLES.md). Every display name of an invented people is a PROPOSAL with the TEST_ prefix (AGENTS rule 7).

const PEOPLE_ABOUT = "Walk sheets for faction members by species (UF_History spawns them at sites; UF_Wildlife's wander AI moves them). Stock RPG Maker placeholders until AR-400 and AR-1800 to AR-1804; tints tell species apart on shared sheets. stats = per-score modifiers (str, dex, con, int, wis, cha) added to the d20 ability scores UF_History rolls for each person (VISION V53); missing keys are 0. names (optional) = the species' own syllables for founders' names, else start.names. Since 2026-09-19 (VISION V87, docs/design/PEOPLES.md): size = the final art's figure height range in px and its frame (ART_STANDARD §2; the peoples suite's sizes check holds delivered sheets to it, stock placeholders to the stock 48 px figure). body, life, needs, senses, move, habitat and constructs are the design's numbers for the life-cycle waves (PEOPLES §2.2, §7; proposals PE9-PE19, PE23 awaiting the user) and are NOT read by any plugin yet: until then every people lives by the human rules. Missing blocks mean 'as humans'.";

const SIZE = {
    human: { px: [44, 48], frame: 48 },
    elf: { px: [44, 48], frame: 48 },
    dwarf: { px: [34, 40], frame: 48 },
    goblin: { px: [34, 40], frame: 48 },
    orc: { px: [44, 48], frame: 48 },
    gnome: { px: [34, 40], frame: 48 },
    automaton: { px: [44, 48], frame: 48 }
};
const DWARF_HABITAT = { level: 0, favourLevel: -1 };

const NEW_PEOPLE = [
    ["lizardfolk", {
        about: "VISION V87; docs/design/PEOPLES.md §3.7. Placeholder: stock Monster_2 tinted (AR-1800). No names table yet: founders use start.names until the syllables of PEOPLES §8.2 pass THEME T10's collision check (PE20). Numbers below: proposals PE9, PE11, PE12, PE17.",
        images: ["$UF_Stock_Monster_2"], tint: "#a8d888", stats: { con: 2, str: 1, int: -1, cha: -1 },
        body: "a tall, long-tailed, scaled biped with a blunt snout; the tail reaches the ground behind",
        size: { px: [54, 60], frame: 96, young: { hatchling: [18, 24], child: [30, 40], frame: 48 } },
        life: { lifespan: [60, 90], stages: { baby: 1, child: 8, teen: 14, elder: 60 }, birth: "eggs", gestation: null, fertility: 1, twins: 0, clutch: [2, 5], incubation: 1, nest: { near: "water", within: 3, sexByWarmth: 0.7, chillAfterDays: 1 } },
        needs: { hunger: 0.5, thirst: 0.8, sleep: 1, social: 0.7, nature: 1.2, warmth: 1, light: 0, eats: "food" },
        senses: { sight: 7, night: 0.5, active: "day" },
        move: ["walk", "swim"],
        habitat: { level: 0, swimIn: ["fresh", "pond", "marsh", "swamp"], alwaysCold: ["tundra", "taiga", "glacier"] }
    }],
    ["kobold", {
        about: "VISION V87; docs/design/PEOPLES.md §3.8. Placeholders: stock Nature_4 and Actor3_4 tinted (AR-1801). No names table yet (PE20). Numbers below: proposals PE9, PE11, PE12, PE18; favourLevel -1 is data for the five-level engine (UF_Levels), not read yet.",
        images: ["$UF_Stock_Nature_4", "$UF_Stock_Actor3_4"], tint: "#d09060", stats: { dex: 2, int: 1, str: -2, con: -1 },
        body: "a small scaled biped with a short tail and a doggish snout",
        size: { px: [26, 32], frame: 48, young: { hatchling: [12, 16], frame: 48 } },
        life: { lifespan: [20, 30], stages: { baby: 1, child: 3, teen: 5, elder: 20 }, birth: "eggs", gestation: null, fertility: 1, twins: 0, clutch: [3, 6], incubation: 0.7, nest: { near: "heat", within: 2, chillLossPerDay: 0.33 } },
        needs: { hunger: 1.1, thirst: 1, sleep: 1, social: 1.3, nature: 0.4, warmth: 0, light: 0, eats: "food" },
        senses: { sight: 6, night: 1, active: "night", sleepHours: [8, 16] },
        move: ["walk", "climb", "burrow"],
        habitat: { level: 0, favourLevel: -1 }
    }],
    ["undead", {
        about: "VISION V87 (the undead do not eat or bear children); docs/design/PEOPLES.md §3.9. The risen keep the body, size and name they had; the founders are risen humans. Placeholders: stock Evil_7 and Monster_3 tinted (AR-1802). Cursed land as their home is the design's proposal PE13 (factions.areas.cursedOk and preferAlignment hold it); raise, decay and mend are PE13 and wait for UF_Remains.",
        images: ["$UF_Stock_Evil_7", "$UF_Stock_Monster_3"], tint: "#c8d0c0", stats: { con: 2, wis: 1, dex: -1, cha: -3 },
        body: "the body they were: a risen human, dwarf or orc keeps that people's size; it decays from fresh to rotting to bone",
        size: { px: [44, 48], frame: 48, as: "the people they were; these numbers are a risen human, the founders" },
        life: { lifespan: null, stages: null, birth: "none", raise: { raiserMagic: 10, bondsBase: 1, bondsPerMagic: 10, corpseCombat: 0.5, bonesCombat: 0.25, unboundDays: 3 }, decay: { rotting: 30, bone: 120 } },
        needs: { hunger: 0, thirst: 0, sleep: 0, social: 0, nature: 0, warmth: 0, light: 0, eats: "none", mend: { item: "bone", hitpointsPer: 3 } },
        senses: { sight: 7, night: 1, active: "night" },
        move: ["walk", "wade_bottom"],
        habitat: { level: 0, alignment: "cursed", crypts: -1 }
    }],
    ["starborn", {
        about: "VISION V87: the high-technology star-born people (the user's 'protoss' as a concept only; no StarCraft names, looks or mechanics, PEOPLES §1.1); docs/design/PEOPLES.md §3.10. 'starborn' is a working id and never reaches player text. Placeholders: stock Evil_5 and Evil_3 tinted (AR-1803); both wear gold and blue, the very scheme the final art must avoid, so they are never a generator reference. constructs: the automaton people are their constructs (PEOPLES §4, PE5). Numbers below: proposals PE9, PE11, PE12, PE16.",
        images: ["$UF_Stock_Evil_5", "$UF_Stock_Evil_3"], tint: "#e8ecff", stats: { int: 2, wis: 2, str: -2, con: -1 },
        constructs: "automaton",
        body: "tall-seeming and slender, long-limbed, a smaller head than a human's, matte skin like pale polished stone with faint near-white light along its natural fracture lines",
        size: { px: [46, 48], frame: 48 },
        life: { lifespan: [700, 1000], stages: { baby: 3, child: 30, teen: 60, elder: 600 }, birth: "live", gestation: 3, fertility: 0.1, twins: 0, clutch: null, incubation: null, nest: null },
        needs: { hunger: 0, thirst: 0.5, sleep: 0.4, social: 0.8, nature: 0.6, warmth: 0, light: 1, eats: "none" },
        senses: { sight: 9, night: 0.6, active: "day", selfLight: 1, sharedSight: 24 },
        move: ["walk"],
        habitat: { level: 0 }
    }],
    ["swarm", {
        about: "VISION V87: the bio-organic swarm (the user's 'Zerg' as a concept only, PEOPLES §1.1); docs/design/PEOPLES.md §3.11. 'swarm' is a working id and never reaches player text. Placeholders: stock SF_Monster_6 and Monster_7 tinted (AR-1804): purple, red-eyed and demon-like, exactly the looks the final art must avoid, so never a generator reference. Until PE6 and wave 2 the swarm starts as V4 says (eight founders around a lit campfire) and lives by the human rules; castes, the Dam and the mound are PE3 words, the numbers PE9, PE11, PE12, PE14, PE15.",
        images: ["$UF_Stock_SF_Monster_6", "$UF_Stock_Monster_7"], tint: "#b8c878", stats: { str: 1, con: 1, dex: 1, int: -3, cha: -4 },
        body: "social-insect castes in natural ochre, olive and bone chitin with dark banding; the breeder (the Dam) shaped like a real termite queen; the mound packed earth, chewed wood and clay",
        size: { px: [14, 36], frame: 48, as: "the grown castes in a 48 frame, by height (worker 14-18 to soldier 30-36); lengths and the 96-frame brute and Dam under castes",
            castes: { worker: { long: [20, 26], tall: [14, 18], frame: 48 }, darter: { long: [28, 34], frame: 48 }, soldier: { long: [36, 44], tall: [30, 36], frame: 48 }, flier: { wingspan: [24, 32], frame: 48 }, borer: { long: [30, 38], frame: 48 }, diver: { long: [32, 40], frame: 48 }, brute: { wide: [64, 80], tall: [56, 72], frame: 96 }, dam: { wide: [88, 96], tall: [56, 64], frame: 96 }, egg: { px: [12, 16], frame: 48 }, mound: { wide: 96, tall: [80, 96], frame: 96, cells: [2, 2] } } },
        life: { lifespan: [2, 4], castes: { worker: [2, 4], darter: [2, 3], flier: [2, 3], soldier: [3, 5], borer: [3, 5], diver: [3, 5], brute: [5, 8], dam: [40, 60] }, stages: null, birth: "mound",
            mound: { biomassPerEgg: 6, eggsPerDay: 3, incubation: 0.5, nymph: 0.5, bud: { members: 30, biomass: 60, minGap: 40, worldCap: 4 } } },
        needs: { hunger: 1.6, thirst: 1, sleep: 0, social: 0, nature: 0, warmth: 0, light: 0, eats: "biomass" },
        senses: { sight: 5, night: 1, active: "shifts", castes: { flier: { sight: 10 } } },
        move: ["walk"],
        moveByCaste: { worker: ["walk", "climb"], darter: ["walk", "climb"], soldier: ["walk"], flier: ["fly"], borer: ["walk", "burrow"], diver: ["walk", "swim"], brute: ["walk"], dam: ["walk"] },
        habitat: { level: 0 }
    }]
];

const FACTIONS_ABOUT_OLD = "One of them, of a species with playable != false, is the player's (factions.playerId).";
const FACTIONS_ABOUT_NEW = "One of them, of a species with playable != false, is the player's (factions.playerId); a world that rolls none has one faction re-rolled among the playable species (2026-09-19, VISION V87). A species with weight 0 is never rolled (the automaton since V87).";

const AUTOMATON_ABOUT_OLD = "science-fiction element (VISION V8)";
const AUTOMATON_ABOUT_NEW = "science-fiction element (VISION V8). Since 2026-09-19 the star-born's constructs (VISION V87 as Claude Code read it; PROPOSAL PE5 awaiting the user; docs/design/PEOPLES.md §4): weight 0, so no new automaton faction is rolled; the entry, its people, culture and sites stay so saves made before load as they were.";

const NEW_SPECIES = [
    { id: "lizardfolk", name: "Lizardfolk", weight: 2, playable: false, groups: ["Fen", "Mere", "Clutch", "Tribe"], about: "VISION V87; docs/design/PEOPLES.md §3.7, §8.1. Group words PROPOSAL PE20, weight PE8; not playable until their eggs work (PE7 A)." },
    { id: "kobold", name: "Kobolds", weight: 2, playable: false, groups: ["Sett", "Seam", "Drift"], about: "VISION V87; docs/design/PEOPLES.md §3.8, §8.1. Group words PROPOSAL PE20, weight PE8; not playable until their eggs work (PE7 A)." },
    { id: "undead", name: "Undead", weight: 1, playable: false, groups: ["Cairn", "Wake", "Knell"], about: "VISION V87; docs/design/PEOPLES.md §3.9, §8.1. Group words PROPOSAL PE20, weight PE8; not playable until raising the dead works (PE7 A)." },
    { id: "starborn", name: "TEST_Glassfolk", weight: 1, playable: false, groups: ["Vigil", "Watch", "Keep"], about: "VISION V87; docs/design/PEOPLES.md §3.10, §8.1. The name is PROPOSAL PE1 A 'Glassfolk' (B 'Sky-wrights', C 'Lightkin', D the user's), with the TEST_ prefix until the user approves (AGENTS rule 7). Group words PE20, weight PE8; not playable until wave 2 (PE7 A)." },
    { id: "swarm", name: "TEST_Teemers", weight: 1, playable: false, groups: ["Mound", "Mass", "Seethe"], about: "VISION V87; docs/design/PEOPLES.md §3.11, §8.1. The name is PROPOSAL PE2 A 'Teemers' (B 'Teemkin', C 'Gnawers', D the user's), with the TEST_ prefix until the user approves (AGENTS rule 7). Group words PE20, weight PE8; not playable until wave 2 (PE7 A)." }
];

// PEOPLES §5 (PE10). Pairs not listed are 0.
const NEW_AFFINITY = [
    [["lizardfolk|human", -10], ["lizardfolk|elf", 5], ["lizardfolk|dwarf", -10], ["lizardfolk|goblin", -20], ["lizardfolk|orc", -15], ["lizardfolk|kobold", -30]],
    [["kobold|human", -15], ["kobold|elf", -15], ["kobold|dwarf", -35], ["kobold|gnome", -25], ["kobold|goblin", 10], ["kobold|orc", 5], ["kobold|starborn", -10]],
    [["starborn|human", 5], ["starborn|elf", 10], ["starborn|gnome", -15], ["starborn|goblin", -30], ["starborn|orc", -10]],
    [["undead|human", -60], ["undead|elf", -60], ["undead|dwarf", -60], ["undead|gnome", -60], ["undead|lizardfolk", -60], ["undead|kobold", -60], ["undead|goblin", -45], ["undead|orc", -50], ["undead|starborn", -45]],
    [["swarm|human", -70], ["swarm|elf", -70], ["swarm|dwarf", -70], ["swarm|gnome", -70], ["swarm|goblin", -70], ["swarm|orc", -70], ["swarm|lizardfolk", -70], ["swarm|kobold", -70], ["swarm|starborn", -70], ["swarm|undead", -70]]
];

const AREAS_ABOUT_ADD = " preferAlignment[species] (2026-09-19, VISION V87, docs/design/PEOPLES.md PE13): a region alignment that species' area centre seeks before its preferred biomes (cells of that alignment with drinkable water within reach, then without); cursedOk must also name it for cursed land.";

const NEW_BIOMES = [
    ["lizardfolk", ["swamp_tropical_fresh", "marsh_tropical_fresh", "swamp_mangrove", "swamp_temperate_fresh", "marsh_temperate_fresh"]],
    ["kobold", ["mountain", "desert_rock", "shrubland_temperate", "taiga"]],
    ["undead", ["desert_badland", "swamp_temperate_fresh", "tundra", "shrubland_temperate"]],
    ["starborn", ["desert_rock", "desert_sand", "mountain", "tundra"]],
    ["swarm", ["forest_tropical_moist_broadleaf", "swamp_tropical_fresh", "marsh_tropical_fresh", "grassland_tropical", "savanna_tropical"]]
];

const NEW_CULTURES = [
    ["lizardfolk", { name: "Fen-dwellers", wall: "wall_wood", laterWall: "wall_wood", door: "door_wood", floor: { kind: "floor_rushes", item: "straw", count: 2 },
        priorities: { hunt: 1.5, gather: 1.2, build: 0.9, chop: 0.9, craft: 0.9, quarry: 0.5, mine: 0.4 }, facetBias: { patience: 20, natureAffinity: 15, bravery: 10, sociability: -5 }, plan: "forest",
        chainWeights: { tanner: 1.3, leatherworker: 1.3, weaponsmith: 0.7, fletcher: 0.6, bowyer: 0.5, furnace_operator: 0.5, armorsmith: 0.5 }, arms: { prefer: ["spear", "club", "shield_wood", "sling"], scavenge: 0.3 },
        about: "VISION V87; docs/design/PEOPLES.md §3.7. The label is PROPOSAL PE20." }],
    ["kobold", { name: "Tunnellers", wall: "rubble_pillar", laterWall: "wall_stone", door: "door_wood", floor: { kind: "floor_rushes", item: "straw", count: 2 },
        priorities: { mine: 1.6, quarry: 1.3, craft: 1.2, pick: 1.2, build: 1, hunt: 0.7, chop: 0.7 }, facetBias: { industriousness: 15, curiosity: 10, sociability: 10, tidiness: -10, bravery: -20 }, plan: "stone",
        chainWeights: { furnace_operator: 1.2, fletcher: 1.1, weaponsmith: 0.9, bowyer: 0.8, armorsmith: 0.6 }, arms: { prefer: ["sling", "spear", "dagger_iron", "helmet_leather"], scavenge: 0.6 },
        about: "VISION V87; docs/design/PEOPLES.md §3.8. The label is PROPOSAL PE20." }],
    ["undead", { name: "The Unquiet", wall: "wall_stone", laterWall: "wall_stone", door: "door_stone", floor: { kind: "floor_stone", item: "stone", count: 1 },
        priorities: { mine: 1.4, quarry: 1.4, build: 1.3, craft: 1, chop: 0.8, hunt: 0.3, pick: 0.3, gather: 0.2 }, facetBias: { discipline: 25, patience: 25, sociability: -25, natureAffinity: -25, cheerfulness: -30 }, plan: "stone",
        chainWeights: { armorsmith: 1.3, weaponsmith: 1.3, furnace_operator: 1.1, fletcher: 0.8, bowyer: 0.8, tanner: 0.2, leatherworker: 0.2 }, arms: { prefer: ["sword_long", "spear", "shield_iron", "helmet_iron", "mail_iron"], scavenge: 0.8 },
        about: "VISION V87; docs/design/PEOPLES.md §3.9. The label is PROPOSAL PE20." }],
    ["starborn", { name: "Light-keepers", wall: "wall_stone", laterWall: "wall_stone", door: "door_stone", floor: { kind: "floor_stone", item: "stone", count: 1 },
        priorities: { craft: 1.5, mine: 1.3, pick: 1.2, build: 1.1, gather: 0.6, chop: 0.6, hunt: 0.3 }, facetBias: { patience: 25, curiosity: 15, discipline: 10, sociability: -5, ambition: -10 }, plan: "workshop",
        chainWeights: { armorsmith: 1.2, furnace_operator: 1.2, weaponsmith: 1.1, carpenter: 0.8, tanner: 0.4, leatherworker: 0.4 }, arms: { prefer: ["spear", "sword_long", "bow_long", "shield_iron"], scavenge: 0 },
        about: "VISION V87; docs/design/PEOPLES.md §3.10. The label is PROPOSAL PE20." }],
    ["swarm", { name: "Comb-builders", wall: "rubble_pillar", laterWall: "rubble_pillar", door: "door_wood", floor: { kind: "floor_rushes", item: "straw", count: 2 },
        priorities: { hunt: 1.8, gather: 1.6, pick: 1.2, build: 1, chop: 0.6, mine: 0.6, quarry: 0.3, craft: 0.1 }, facetBias: { discipline: 40, bravery: 30, tidiness: 20, curiosity: -20, cheerfulness: -10 }, plan: "default",
        chainWeights: { furnace_operator: 0, weaponsmith: 0, armorsmith: 0, bowyer: 0, fletcher: 0, tanner: 0, leatherworker: 0, carpenter: 0 }, arms: { prefer: [], scavenge: 0 },
        about: "VISION V87; docs/design/PEOPLES.md §3.11. The label is PROPOSAL PE20 (was 'Devourers', a StarCraft unit, dropped in review). rubble_pillar and door_wood stand in for grown walls and a grown door until the mound plan exists (wave 2); chainWeights 0 keep them out of every trade chain (they use no tools or arms)." }]
];

//-----------------------------------------------------------------------------
// Text helpers

/** One-line JSON in the catalog's style: { "a": 1, "b": ["x", "y"] }. */
function compact(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(compact).join(", ")}]`;
    const keys = Object.keys(v);
    return keys.length ? `{ ${keys.map(k => `${JSON.stringify(k)}: ${compact(v[k])}`).join(", ")} }` : "{}";
}
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortKeys = v => (v === null || typeof v !== "object" ? v : Array.isArray(v) ? v.map(sortKeys) : Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])));
const sameData = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

function fail(msg) {
    console.log(`add_peoples_catalog: FAIL ${msg}`);
    process.exit(1);
}

/** [first, last] line indexes of a top-level key's block ("  "key": {" ... "  },"). */
function topBlock(lines, key) {
    const start = lines.findIndex(l => l.replace(/\r$/, "").startsWith(`  ${JSON.stringify(key)}: `));
    if (start < 0) fail(`no top-level "${key}"`);
    let end = start;
    while (end < lines.length && !/^  [}\]],?\r?$/.test(lines[end])) end++;
    if (end >= lines.length) fail(`"${key}" block has no end`);
    return [start, end];
}
/** Index of the line in [from, to] that starts with the given text (after the indentation). */
function lineOf(lines, from, to, startsWith, what) {
    for (let i = from; i <= to; i++) if (lines[i].trimStart().startsWith(startsWith)) return i;
    fail(`${what}: no line starting ${startsWith}`);
    return -1;
}
const eol = line => (line.endsWith("\r") ? "\r" : "");
const body = line => line.replace(/\r$/, "");

/** Insert `, "key": value` before the final " }" of a one-line entry (keeping its trailing comma). */
function appendKey(line, key, value) {
    const b = body(line);
    const m = /^(.*) }(,?)$/.exec(b);
    if (!m) fail(`cannot append "${key}" to: ${b.slice(0, 80)}...`);
    return `${m[1]}, ${JSON.stringify(key)}: ${compact(value)} }${m[2]}${eol(line)}`;
}
/** Make sure a line ends with a comma (before \r). */
const withComma = line => (body(line).endsWith(",") ? line : `${body(line)},${eol(line)}`);

//-----------------------------------------------------------------------------

function edit(raw) {
    const before = JSON.parse(raw);
    const lines = raw.split("\n");
    const nl = eol(lines[1] || "");

    // people
    {
        const [s, e] = topBlock(lines, "people");
        const aboutAt = lineOf(lines, s, e, `"about": `, "people.about");
        lines[aboutAt] = `    "about": ${JSON.stringify(PEOPLE_ABOUT)},${eol(lines[aboutAt])}`;
        for (const id of Object.keys(SIZE)) {
            const i = lineOf(lines, s, e, `${JSON.stringify(id)}: `, `people.${id}`);
            lines[i] = appendKey(lines[i], "size", SIZE[id]);
            if (id === "dwarf") lines[i] = appendKey(lines[i], "habitat", DWARF_HABITAT);
        }
        const last = lineOf(lines, s, e, `"automaton": `, "people.automaton");
        if (last !== e - 1) fail("people.automaton is not the last people line");
        lines[last] = withComma(lines[last]);
        const add = NEW_PEOPLE.map(([id, v], k) => `    ${JSON.stringify(id)}: ${compact(v)}${k < NEW_PEOPLE.length - 1 ? "," : ""}${nl}`);
        lines.splice(last + 1, 0, ...add);
    }
    // factions
    {
        const [s, e] = topBlock(lines, "factions");
        const aboutAt = lineOf(lines, s, e, `"about": `, "factions.about");
        if (!lines[aboutAt].includes(FACTIONS_ABOUT_OLD)) fail("factions.about lacks the sentence to replace");
        lines[aboutAt] = lines[aboutAt].replace(FACTIONS_ABOUT_OLD, FACTIONS_ABOUT_NEW);
        const auto = lineOf(lines, s, e, `{ "id": "automaton"`, "factions.species automaton");
        if (!/"weight": 1, /.test(lines[auto]) || !lines[auto].includes(JSON.stringify(AUTOMATON_ABOUT_OLD))) fail("the automaton species line is not the expected one");
        lines[auto] = lines[auto].replace(/"weight": 1, /, `"weight": 0, `).replace(JSON.stringify(AUTOMATON_ABOUT_OLD), JSON.stringify(AUTOMATON_ABOUT_NEW));
        if (!/^\s*\],?\r?$/.test(lines[auto + 1])) fail("the automaton is not the last species line");
        lines[auto] = withComma(lines[auto]);
        lines.splice(auto + 1, 0, ...NEW_SPECIES.map((sp, k) => `      ${compact(sp)}${k < NEW_SPECIES.length - 1 ? "," : ""}${nl}`));
        // speciesAffinity: after its last pair line
        const [s2, e2] = topBlock(lines, "factions");
        const affAt = lineOf(lines, s2, e2, `"speciesAffinity": {`, "factions.speciesAffinity");
        let close = affAt + 1;
        while (!/^\s*},?\r?$/.test(lines[close])) close++;
        lines[close - 1] = withComma(lines[close - 1]);
        lines.splice(close, 0, ...NEW_AFFINITY.map((row, k) => `      ${row.map(([p, v]) => `${JSON.stringify(p)}: ${v}`).join(", ")}${k < NEW_AFFINITY.length - 1 ? "," : ""}${nl}`));
        // areas
        const [s3, e3] = topBlock(lines, "factions");
        const areasAt = lineOf(lines, s3, e3, `"areas": {`, "factions.areas");
        if (!lines[areasAt].includes(`"cursedOk": [] }`)) fail("factions.areas.cursedOk is not the expected []");
        const areas = before.factions.areas;
        lines[areasAt] = lines[areasAt]
            .replace(JSON.stringify(areas.about), JSON.stringify(areas.about + AREAS_ABOUT_ADD))
            .replace(`"cursedOk": [] }`, `"cursedOk": ["undead"], "preferAlignment": { "undead": "cursed" } }`);
    }
    // sites.preferredBiomes
    {
        const [s, e] = topBlock(lines, "sites");
        const pb = lineOf(lines, s, e, `"preferredBiomes": {`, "sites.preferredBiomes");
        let close = pb + 1;
        while (!/^\s*},?\r?$/.test(lines[close])) close++;
        lines[close - 1] = withComma(lines[close - 1]);
        lines.splice(close, 0, ...NEW_BIOMES.map(([id, list], k) => `      ${JSON.stringify(id)}: ${compact(list)}${k < NEW_BIOMES.length - 1 ? "," : ""}${nl}`));
    }
    // cultures
    {
        const [s, e] = topBlock(lines, "cultures");
        const last = lineOf(lines, s, e, `"automaton": `, "cultures.automaton");
        if (last !== e - 1) fail("cultures.automaton is not the last culture line");
        lines[last] = withComma(lines[last]);
        lines.splice(last + 1, 0, ...NEW_CULTURES.map(([id, v], k) => `    ${JSON.stringify(id)}: ${compact(v)}${k < NEW_CULTURES.length - 1 ? "," : ""}${nl}`));
    }
    return lines.join("\n");
}

/** Throws unless `after` is `before` plus exactly this data. Returns a summary. */
function verify(before, after) {
    const problems = [];
    const touched = new Set(["people", "factions", "sites", "cultures"]);
    const keysB = Object.keys(before), keysA = Object.keys(after);
    if (JSON.stringify(keysB) !== JSON.stringify(keysA)) problems.push(`top-level keys changed: ${keysB.join(",")} -> ${keysA.join(",")}`);
    for (const k of keysB) if (!touched.has(k) && !deepEqual(before[k], after[k])) problems.push(`top-level "${k}" changed`);
    // people
    for (const id of Object.keys(before.people)) {
        if (id === "about") continue;
        const want = Object.assign({}, before.people[id], { size: SIZE[id] }, id === "dwarf" ? { habitat: DWARF_HABITAT } : {});
        if (!SIZE[id]) problems.push(`people.${id}: an existing people this tool does not know`);
        else if (!sameData(after.people[id], want)) problems.push(`people.${id} is not the old entry plus size${id === "dwarf" ? " and habitat" : ""}`);
    }
    if (after.people.about !== PEOPLE_ABOUT) problems.push("people.about");
    for (const [id, v] of NEW_PEOPLE) if (!sameData(after.people[id], v)) problems.push(`people.${id}`);
    const peopleKeys = Object.keys(after.people);
    if (peopleKeys.length !== Object.keys(before.people).length + NEW_PEOPLE.length) problems.push(`people has ${peopleKeys.length} keys`);
    // factions
    const fb = before.factions, fa = after.factions;
    for (const k of Object.keys(fb)) if (!["about", "species", "speciesAffinity", "areas"].includes(k) && !deepEqual(fb[k], fa[k])) problems.push(`factions.${k} changed`);
    if (JSON.stringify(Object.keys(fb)) !== JSON.stringify(Object.keys(fa))) problems.push("factions keys changed");
    if (fa.about !== fb.about.replace(FACTIONS_ABOUT_OLD, FACTIONS_ABOUT_NEW)) problems.push("factions.about");
    const oldSp = fb.species.filter(s => s.id !== "automaton");
    if (!deepEqual(fa.species.slice(0, oldSp.length), oldSp)) problems.push("existing species entries changed");
    const autoB = fb.species.find(s => s.id === "automaton"), autoA = fa.species.find(s => s.id === "automaton");
    if (!autoA || !sameData(autoA, Object.assign({}, autoB, { weight: 0, about: AUTOMATON_ABOUT_NEW }))) problems.push("species automaton");
    if (!sameData(fa.species.slice(fb.species.length), NEW_SPECIES)) problems.push("new species entries");
    if (fa.species.length !== fb.species.length + NEW_SPECIES.length) problems.push("species count");
    const affWant = Object.assign({}, fb.speciesAffinity, Object.fromEntries(NEW_AFFINITY.flat()));
    if (!sameData(fa.speciesAffinity, affWant)) problems.push("speciesAffinity");
    for (const [p] of NEW_AFFINITY.flat()) if (p in fb.speciesAffinity || p.split("|").reverse().join("|") in fb.speciesAffinity) problems.push(`speciesAffinity ${p} already existed`);
    const areasWant = Object.assign({}, fb.areas, { about: fb.areas.about + AREAS_ABOUT_ADD, cursedOk: ["undead"], preferAlignment: { undead: "cursed" } });
    if (!sameData(fa.areas, areasWant)) problems.push("factions.areas");
    // sites
    for (const k of Object.keys(before.sites)) if (k !== "preferredBiomes" && !deepEqual(before.sites[k], after.sites[k])) problems.push(`sites.${k} changed`);
    if (!sameData(after.sites.preferredBiomes, Object.assign({}, before.sites.preferredBiomes, Object.fromEntries(NEW_BIOMES)))) problems.push("sites.preferredBiomes");
    // cultures
    if (!sameData(after.cultures, Object.assign({}, before.cultures, Object.fromEntries(NEW_CULTURES)))) problems.push("cultures");
    // references the new data makes
    const objects = new Set((after.objects || []).map(o => o.id));
    const items = new Set(((after.items || {}).types || []).map(t => t.id));
    const biomes = new Set(Object.keys(after.biomes || {}));
    const plans = new Set(["default", ...Object.keys(((after.colony || {}).plans) || {})]);
    const labors = new Set((((after.labors || {}).list) || []).map(l => l.id));
    for (const [id, c] of NEW_CULTURES) {
        for (const k of ["wall", "laterWall", "door"]) if (!objects.has(c[k])) problems.push(`cultures.${id}.${k} ${c[k]} is not an object`);
        if (!["floor_wood", "floor_stone", "floor_rushes"].includes(c.floor.kind) || !items.has(c.floor.item)) problems.push(`cultures.${id}.floor`);
        if (!plans.has(c.plan)) problems.push(`cultures.${id}.plan ${c.plan}`);
        for (const a of c.arms.prefer) if (!items.has(a)) problems.push(`cultures.${id}.arms ${a} is not an item`);
        for (const l of Object.keys(c.chainWeights)) if (!labors.has(l)) problems.push(`cultures.${id}.chainWeights ${l} is not a labor`);
    }
    for (const [id, list] of NEW_BIOMES) for (const b of list) if (!biomes.has(b)) problems.push(`preferredBiomes.${id} ${b} is not a biome`);
    return problems;
}

function main() {
    if (!fs.existsSync(file)) { console.log(`add_peoples_catalog: no ${file}`); process.exit(2); }
    const raw = fs.readFileSync(file, "utf8"); // re-read right before writing: nothing older is used
    const cat = JSON.parse(raw);
    const present = NEW_PEOPLE.filter(([id]) => cat.people && cat.people[id]).length;
    if (present === NEW_PEOPLE.length) {
        // Already there: it must be exactly this data (the other keys can't be compared without the old file).
        const problems = [];
        for (const [id, v] of NEW_PEOPLE) if (!sameData(cat.people[id], v)) problems.push(`people.${id}`);
        for (const [id, v] of NEW_CULTURES) if (!sameData(cat.cultures[id], v)) problems.push(`cultures.${id}`);
        for (const sp of NEW_SPECIES) if (!sameData(cat.factions.species.find(s => s.id === sp.id), sp)) problems.push(`species ${sp.id}`);
        const auto = cat.factions.species.find(s => s.id === "automaton");
        if (!auto || auto.weight !== 0) problems.push("automaton weight");
        for (const [p, v] of NEW_AFFINITY.flat()) if (cat.factions.speciesAffinity[p] !== v) problems.push(`affinity ${p}`);
        for (const [id, list] of NEW_BIOMES) if (!deepEqual(cat.sites.preferredBiomes[id], list)) problems.push(`preferredBiomes.${id}`);
        if (!deepEqual(cat.factions.areas.cursedOk, ["undead"]) || !deepEqual(cat.factions.areas.preferAlignment, { undead: "cursed" })) problems.push("factions.areas");
        for (const id of Object.keys(SIZE)) if (!sameData(cat.people[id].size, SIZE[id])) problems.push(`people.${id}.size`);
        console.log(problems.length ? `add_peoples_catalog: FAIL already edited but differs: ${problems.join(", ")}` : `add_peoples_catalog: already there (${file})`);
        process.exit(problems.length ? 1 : 0);
    }
    if (present) fail(`only ${present} of the ${NEW_PEOPLE.length} new peoples are in the catalog; edit by hand`);
    if (checkOnly) { console.log(`add_peoples_catalog: FAIL not applied yet (${file})`); process.exit(1); }
    const out = edit(raw);
    let after;
    try { after = JSON.parse(out); } catch (e) { fail(`the edited text does not parse: ${e.message}`); }
    const problems = verify(cat, after);
    if (problems.length) fail(`the edit would change more or less than intended: ${problems.join("; ")}`);
    // Layout: every line of the old file that the tool didn't rewrite is still there, in order.
    const oldLines = raw.split("\n"), newLines = out.split("\n");
    let j = 0, kept = 0, rewritten = 0;
    for (const l of oldLines) {
        const k = newLines.indexOf(l, j);
        if (k >= 0) { j = k + 1; kept++; } else rewritten++;
    }
    if (rewritten > 16) fail(`${rewritten} old lines rewritten (expected at most 16)`);
    // Re-read once more: if someone wrote the file meanwhile, stop rather than overwrite their change.
    if (fs.readFileSync(file, "utf8") !== raw) fail("the catalog changed while editing; run again");
    fs.writeFileSync(file, out);
    const check = JSON.parse(fs.readFileSync(file, "utf8"));
    const again = verify(cat, check);
    if (again.length) fail(`after writing: ${again.join("; ")}`);
    console.log(`add_peoples_catalog: PASS wrote ${file}: ${NEW_PEOPLE.length} peoples, ${NEW_CULTURES.length} cultures, ${NEW_SPECIES.length} species, ${NEW_AFFINITY.flat().length} relation pairs, ${NEW_BIOMES.length} biome lists; `
        + `automaton weight 0; ${Object.keys(SIZE).length} size blocks; ${kept} old lines kept, ${rewritten} rewritten, ${newLines.length - oldLines.length} added; every other key unchanged`);
}

main();
