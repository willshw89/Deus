// Adds the ecology director's tuning (catalog key "ecology", VISION V74, V75, V83, V85) and appends one object,
// "sapling" (docs/design/ECOLOGY.md §5), to game/data/UF_WorldCatalog.json.
// The file is re-read immediately before writing. Only the new top-level key "ecology" is added and one entry is
// appended to the end of "objects"; every other key and every existing object is asserted unchanged. --check never
// writes. Running it twice changes nothing the second time.
// Usage: node tools/add_ecology_catalog.js [--game <game folder>] [--check]
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const checkOnly = args.includes("--check");
const file = path.join(gameDir, "data", "UF_WorldCatalog.json");

// One placeholder object: stock Outside_B tile 152 ("Grass A"), tinted; the art request is in docs/ASSET_REQUESTS.md.
// What it grows into is not a field: it lives in the cell's growth timer (UF_Ecology), so one object serves every tree.
const SAPLING = {
    id: "sapling", name: "Sapling", tile: { sheet: "Outside_B", id: 152 }, tint: "#7fb35a",
    under: true, passable: true, tags: ["plant", "sapling", "wood"],
    actions: { gather: { work: 20, yields: { fiber: 1 }, becomes: null } }
};

// Durations are in world beats (V85: 60 beats = 1 game hour at x1). UF's own starting values, tuned from telemetry later.
const ECOLOGY = {
    about: "UF_Ecology (VISION V74, V75, V83, V85; docs/design/ECOLOGY.md, docs/systems/UF_Ecology.md): a census per (level, 64x64 block, biome) bucket; fauna breed near their herds and arrive from the map edge; monsters come on a seeded clock away from camps, sites and people; plants spread, seed and regrow on the same cell; minerals never return. The director runs once per game hour and services bucketsPerStep buckets in a seeded round-robin, never placing anything in view or on a cell a unit could not walk onto (V68). Every duration is in world beats. Owner: Claude Code.",
    version: 2,
    director: { bucketsPerStep: 6, attemptsPerStep: 32, blockSize: 64, sampleStride: 4, minBucketSamples: 4, viewMargin: 4, stepBudgetMs: 2.0 },
    seasons: { Spring: 1.5, Summer: 1.0, Autumn: 0.6, Winter: 0.2 },
    fauna: {
        targetScale: 1.0, localCapScale: 1.5, globalCapScale: 1.3, worldCap: 320,
        birth: { rate: 0.5, minHerd: 2, spread: 3, maxOverSize0: 0, tries: 4 },
        arrival: { rate: 0.25, entryPoints: 64, cooldownBeats: 4320, maxInFlight: 3, flightBeats: 2880, tries: 6 },
        species: {
            hare: { birthBeats: 2880, litter: [1, 3] },
            rat: { birthBeats: 2880, litter: [1, 3] },
            fowl: { birthBeats: 2880, litter: [1, 2] },
            songbird: { birthBeats: 4320, litter: [1, 2] },
            bat: { birthBeats: 4320, litter: [1, 2] },
            deer: { birthBeats: 8640, litter: [1, 1] },
            boar: { birthBeats: 8640, litter: [1, 2] },
            wild_sheep: { birthBeats: 8640, litter: [1, 1] },
            aurochs: { birthBeats: 14400, litter: [1, 1] },
            wild_horse: { birthBeats: 14400, litter: [1, 1] },
            "@predator": { birthBeats: 11520, litter: [1, 1] },
            "@default": { birthBeats: 8640, litter: [1, 1] }
        }
    },
    monsters: {
        localCapScale: 1.0, globalCapScale: 1.0, bucketCap: 2,
        intervalBeats: [2160, 5760], chance: 0.6, entry: "habitat", tries: 8,
        clearance: { playerCamp: 60, camp: 40, site: 40, person: 12 }
    },
    plants: {
        absentFloor: 0.25, hardCapScale: 1.2, maxDensity: 0.35, seedRadius: 3, seedRainRate: 0.05, spreadTries: 3, rainTries: 2,
        campClearance: { tree: 8, bush: 4, plant: 0 },
        maxTimers: 4096, timersPerStep: 64,
        kinds: {
            "@tree": { via: "sapling", stumpToSaplingBeats: 4320, saplingToTreeBeats: 8640, spreadRate: 0.15 },
            "@bush": { regrowBeats: 7200, spreadRate: 0.35 },
            "@plant": { regrowBeats: 2880, spreadRate: 0.6 },
            berry_bush: { regrowBeats: 8640, spreadRate: 0.3 },
            cactus_tall: { regrowBeats: 14400, spreadRate: 0.15 },
            lily_pad: { regrowBeats: 4320, spreadRate: 0.4, on: "water" },
            dead_tree: { renewable: false }
        }
    },
    levels: {
        "-2": { enabled: false, creatureCap: 60, monsterCap: 8, species: [], plants: [], biomes: "deep" },
        "-1": { enabled: false, creatureCap: 60, monsterCap: 6, species: [], plants: [], biomes: "earth" },
        "0": { enabled: true, creatureCap: 240, monsterCap: 12, species: "@wildlife", plants: "@biomes" },
        "1": { enabled: false, creatureCap: 30, monsterCap: 0, species: ["hawk", "songbird", "bat"], plants: [], biomes: "@column" },
        "2": { enabled: false, creatureCap: 20, monsterCap: 0, species: ["hawk", "songbird"], plants: [], biomes: "@column" }
    }
};

// The catalog's own inline style: { "a": 1, "b": ["x", "y"] }.
function inline(v) {
    if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
    if (v && typeof v === "object") {
        const keys = Object.keys(v);
        return keys.length ? `{ ${keys.map(k => `${JSON.stringify(k)}: ${inline(v[k])}`).join(", ")} }` : "{}";
    }
    return JSON.stringify(v);
}
// Levels in their natural order (a JS object would list "0", "1", "2" before "-2", "-1").
const LEVEL_ORDER = ["-2", "-1", "0", "1", "2"];

// The catalog's own style: one line per member of a top-level section, nested values inline.
function sectionLines(name, obj, last) {
    const keys = Object.keys(obj);
    const out = [`  ${JSON.stringify(name)}: {`];
    keys.forEach((k, i) => {
        const v = obj[k];
        let text;
        if (v && typeof v === "object" && !Array.isArray(v) && (k === "fauna" || k === "plants" || k === "levels")) {
            // One more level of lines for the big blocks, so a reviewer can read them.
            const innerKeys = k === "levels" ? LEVEL_ORDER.filter(x => x in v) : Object.keys(v);
            const inner = innerKeys.map((k2, j, all) => {
                const v2 = v[k2];
                if (v2 && typeof v2 === "object" && !Array.isArray(v2) && (k2 === "species" || k2 === "kinds")) {
                    const rows = Object.keys(v2).map((k3, m, all3) => `        ${JSON.stringify(k3)}: ${inline(v2[k3])}${m < all3.length - 1 ? "," : ""}`);
                    return [`      ${JSON.stringify(k2)}: {`, ...rows, `      }${j < all.length - 1 ? "," : ""}`].join("\n");
                }
                return `      ${JSON.stringify(k2)}: ${inline(v2)}${j < all.length - 1 ? "," : ""}`;
            });
            text = [`    ${JSON.stringify(k)}: {`, ...inner, `    }`].join("\n");
            out.push(`${text}${i < keys.length - 1 ? "," : ""}`);
            return;
        }
        out.push(`    ${JSON.stringify(k)}: ${inline(v)}${i < keys.length - 1 ? "," : ""}`);
    });
    out.push(`  }${last ? "" : ","}`);
    return out;
}

function main() {
    const raw = fs.readFileSync(file, "utf8");
    const before = JSON.parse(raw);
    if (!Array.isArray(before.objects)) throw new Error("the catalog has no objects list");
    const lines = raw.split("\n");
    const changes = [];

    // 1. Append "sapling" to the top-level objects list (two-space indent: the one right under the root).
    if (!before.objects.some(o => o && o.id === SAPLING.id)) {
        const start = lines.findIndex(l => /^  "objects": \[/.test(l));
        if (start < 0) throw new Error('no top-level "objects": [ line');
        let end = -1;
        for (let i = start + 1; i < lines.length; i++) if (/^  \],?\s*$/.test(lines[i])) { end = i; break; }
        if (end < 0) throw new Error("no closing line for objects");
        let last = end - 1;
        while (last > start && lines[last].trim() === "") last--;
        if (!/\}\s*,?\s*$/.test(lines[last])) throw new Error("the last objects line is not an entry");
        if (!/,\s*$/.test(lines[last])) lines[last] = lines[last].replace(/\s*$/, ",");
        const text = inline(SAPLING);
        lines.splice(last + 1, 0, `    ${text}`);
        changes.push("objects: + sapling (appended; every existing type number unchanged)");
    }

    // 2. Add the top-level "ecology" key at the end of the root object.
    if (!before.ecology) {
        let close = lines.length - 1;
        while (close > 0 && lines[close].trim() === "") close--;
        if (lines[close].trim() !== "}") throw new Error("the file does not end with the root's closing brace");
        let prev = close - 1;
        while (prev > 0 && lines[prev].trim() === "") prev--;
        if (!/^  [\}\]]\s*$/.test(lines[prev]) && !/^  "[^"]+": .*[^,]\s*$/.test(lines[prev])) throw new Error(`unexpected line before the root's closing brace: ${lines[prev].slice(0, 80)}`);
        if (!/,\s*$/.test(lines[prev])) lines[prev] = lines[prev].replace(/\s*$/, ",");
        lines.splice(close, 0, ...sectionLines("ecology", ECOLOGY, true));
        changes.push("ecology: + key (director, seasons, fauna, monsters, plants, levels)");
    }

    if (!changes.length) { console.log(`${file}: ecology and sapling already present, nothing to do`); return; }
    const out = lines.join("\n");
    const after = JSON.parse(out);
    for (const key of Object.keys(before)) {
        if (key === "objects") continue;
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw new Error(`section "${key}" changed unexpectedly`);
    }
    const extra = Object.keys(after).filter(k => !(k in before));
    if (extra.some(k => k !== "ecology")) throw new Error(`unexpected new keys: ${extra.join(", ")}`);
    if (JSON.stringify(after.objects.slice(0, before.objects.length)) !== JSON.stringify(before.objects)) throw new Error("existing objects changed or moved");
    const added = after.objects.slice(before.objects.length);
    if (added.length > 1 || (added.length === 1 && JSON.stringify(added[0]) !== JSON.stringify(SAPLING))) throw new Error("objects: something other than the sapling was appended");
    if (JSON.stringify(after.ecology) !== JSON.stringify(before.ecology || ECOLOGY)) throw new Error("ecology written wrong");
    for (const line of changes) console.log(line);
    if (checkOnly) { console.log("(check only: nothing written)"); return; }
    // Re-read right before writing: someone else may have changed the file while this ran.
    if (fs.readFileSync(file, "utf8") !== raw) throw new Error("the catalog changed on disk while this ran; run it again");
    fs.writeFileSync(file, out);
    console.log(`written: ${file} (${raw.length} -> ${out.length} bytes)`);
}

try { main(); } catch (e) { console.error(`add_ecology_catalog: ${e.message}`); process.exit(1); }
