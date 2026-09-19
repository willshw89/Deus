"use strict";
const fs = require("fs");
const path = require("path");

const catalogPath = path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
const palettePath = path.resolve(__dirname, "..", "art", "palette", "uf.hex");

const hexLines = fs.readFileSync(palettePath, "utf8").trim().split(/\r?\n/).map(l => l.trim().toUpperCase());
const hexSet = new Set(hexLines);

const newGroundKinds = [
    { "id": "meadow", "name": "Meadow", "pattern": "grass", "colors": ["#5D7139", "#4D5D28", "#71864D", "#8A9A61"], "edge": "#39451C" },
    { "id": "tropical_grass", "name": "Lush grass", "pattern": "grass", "colors": ["#189218", "#006D00", "#45B645", "#86D200"], "edge": "#006D00" },
    { "id": "dry_grass", "name": "Dry grass", "pattern": "grass", "colors": ["#C69618", "#B28210", "#DBAE20", "#F3DF79"], "edge": "#B28210" },
    { "id": "shrub_soil", "name": "Scrub soil", "pattern": "dots", "colors": ["#AA8659", "#9A7141", "#BA9A71", "#5D7139"], "edge": "#9A7141" },
    { "id": "forest_floor", "name": "Leaf litter", "pattern": "litter", "colors": ["#6D4D3D", "#553D31", "#825D4D", "#9E5124"], "edge": "#553D31" },
    { "id": "needle_floor", "name": "Needle floor", "pattern": "needles", "colors": ["#39451C", "#283114", "#4D5D28", "#6D3D0C"], "edge": "#283114" },
    { "id": "jungle_floor", "name": "Jungle floor", "pattern": "litter", "colors": ["#4D5D28", "#39451C", "#71864D", "#8A5D2D"], "edge": "#39451C" },
    { "id": "tundra", "name": "Tundra", "pattern": "dots", "colors": ["#9EAE7D", "#8A9A61", "#B6C29A", "#CEC6BE"], "edge": "#8A9A61" },
    { "id": "snow", "name": "Snow", "pattern": "snow", "colors": ["#EFEFEF", "#DBDBFF", "#FFFFFF", "#CECECE"], "edge": "#BEBEBE" },
    { "id": "ice", "name": "Ice", "pattern": "ice", "colors": ["#B2D7F3", "#71AEE7", "#F3F3FF", "#6DB2E7"], "edge": "#71AEE7" },
    { "id": "sand", "name": "Sand", "pattern": "dots", "colors": ["#CAB292", "#BA9A71", "#DBCAB2", "#F7E7A6"], "edge": "#BA9A71" },
    { "id": "stony", "name": "Stony ground", "pattern": "cracks", "colors": ["#9E928A", "#7D7169", "#AEA29A", "#615551"], "edge": "#7D7169" },
    { "id": "red_clay", "name": "Red clay", "pattern": "stria", "colors": ["#AE653D", "#9E5124", "#BE825D", "#7D2D00"], "edge": "#9E5124" },
    { "id": "rock", "name": "Bare rock", "pattern": "cracks", "colors": ["#7D7D7D", "#616161", "#8E8E8E", "#514945"], "edge": "#616161" },
    { "id": "peak_rock", "name": "Rock face", "pattern": "cracks", "colors": ["#515151", "#453D39", "#6D6D6D", "#35312D"], "edge": "#181818", "passable": false },
    { "id": "mud", "name": "Mud", "pattern": "mud", "colors": ["#6D4D3D", "#553D31", "#7D6559", "#415120"], "edge": "#553D31" },
    { "id": "swamp_mud", "name": "Swamp mud", "pattern": "mud", "colors": ["#45352D", "#352D24", "#514139", "#39451C"], "edge": "#352D24" },
    { "id": "dirt", "name": "Dirt", "pattern": "dots", "colors": ["#8A5D2D", "#6D3D0C", "#9A7141", "#5D350C"], "edge": "#6D3D0C" },
    { "id": "cursed_grass", "name": "Blighted grass", "pattern": "grass", "colors": ["#7D7169", "#615551", "#8E8279", "#6D006D"], "edge": "#615551" },
    { "id": "blessed_grass", "name": "Flowering grass", "pattern": "grass", "colors": ["#45B645", "#189218", "#7DDF7D", "#F7E7A6"], "edge": "#189218" },
    { "id": "ash", "name": "Ash", "pattern": "dots", "colors": ["#515151", "#454545", "#616161", "#6D2400"], "edge": "#454545" },
    { "id": "scree", "name": "Scree", "pattern": "cracks", "colors": ["#6D615D", "#615551", "#7D7169", "#514945"], "edge": "#615551" },
    { "id": "road", "name": "Packed earth", "pattern": "dots", "colors": ["#BA9A71", "#8E7565", "#CAB292", "#6D4D3D"], "edge": "#6D4D3D" },
    { "id": "floor_wood", "name": "Plank floor", "pattern": "planks", "colors": ["#9A7141", "#653D10", "#BE825D", "#3D240C"], "edge": "#2D1C08" },
    { "id": "floor_stone", "name": "Flagstone floor", "pattern": "cracks", "colors": ["#8E8E8E", "#6D6D6D", "#AEAEAE", "#454545"], "edge": "#353535" },
    { "id": "floor_rushes", "name": "Rush floor", "pattern": "needles", "colors": ["#AA8659", "#9A7141", "#F7E7A6", "#6D4D3D"], "edge": "#553D31" }
];

const groundShades = {
    "about": "VISION V93, docs/design/GROUND_SHADES.md: rolling terrain shades and gradient ramps across overworld ground kinds.",
    "field": {
        "scale": 24,
        "detailScale": 10,
        "weights": { "noise": 0.45, "detail": 0.20, "rain": 0.20, "drainage": 0.10, "height": 0.20, "water": 0.15, "level": 0.08 },
        "heightFrom": 0.55,
        "waterReach": 6
    },
    "ditherBand": 0.15,
    "toneJitter": 0.08,
    "maskGrid": 16,
    "families": {
        "grass": {
            "pattern": "grass",
            "steps": [
                { "name": "lush", "tones": ["#189218", "#006D00", "#45B645", "#86D200"], "source": "tropical_grass" },
                { "name": "deep_lush", "tones": ["#4D5D28", "#39451C", "#189218", "#45B645"], "source": "tropical_grass" },
                { "name": "meadow", "tones": ["#5D7139", "#4D5D28", "#71864D", "#8A9A61"], "source": "meadow" },
                { "name": "dry_meadow", "tones": ["#71864D", "#5D7139", "#8A9A61", "#B28210"], "source": "meadow" },
                { "name": "khaki", "tones": ["#8A9A61", "#71864D", "#AA8659", "#C69618"], "source": "dry_grass" },
                { "name": "straw", "tones": ["#C69618", "#B28210", "#DBAE20", "#F3DF79"], "source": "dry_grass" }
            ],
            "kinds": {
                "tropical_grass": { "window": [0, 2], "base": 0, "shares": [0.35, 0.45, 0.20] },
                "meadow": { "window": [1, 4], "base": 2, "shares": [0.20, 0.35, 0.30, 0.15] },
                "dry_grass": { "window": [3, 5], "base": 5, "shares": [0.25, 0.35, 0.40] }
            }
        },
        "litter": {
            "pattern": "litter",
            "steps": [
                { "name": "moss", "tones": ["#415120", "#313D18", "#5D7139", "#7D4D18"], "source": "jungle_floor" },
                { "name": "jungle_litter", "tones": ["#4D5D28", "#39451C", "#71864D", "#8A5D2D"], "source": "jungle_floor" },
                { "name": "damp_litter", "tones": ["#553D31", "#3D2D24", "#6D4D3D", "#5D7139"], "source": "forest_floor" },
                { "name": "leaf_litter", "tones": ["#6D4D3D", "#553D31", "#825D4D", "#9E5124"], "source": "forest_floor" },
                { "name": "dry_litter", "tones": ["#7D4D18", "#6D3D0C", "#8A5D2D", "#AE653D"], "source": "forest_floor" }
            ],
            "kinds": {
                "jungle_floor": { "window": [0, 2], "base": 1, "shares": [0.30, 0.50, 0.20] },
                "forest_floor": { "window": [2, 4], "base": 3, "shares": [0.25, 0.50, 0.25] }
            }
        },
        "needles": {
            "pattern": "needles",
            "steps": [
                { "name": "mossy", "tones": ["#415120", "#313D18", "#5D7139", "#5D350C"], "source": "needle_floor" },
                { "name": "needles", "tones": ["#39451C", "#283114", "#4D5D28", "#6D3D0C"], "source": "needle_floor" },
                { "name": "brown", "tones": ["#4D2D0C", "#3D240C", "#5D350C", "#7D4D18"], "source": "needle_floor" }
            ],
            "kinds": {
                "needle_floor": { "window": [0, 2], "base": 1, "shares": [0.25, 0.55, 0.20] }
            }
        },
        "soil": {
            "pattern": "dots",
            "steps": [
                { "name": "loam", "tones": ["#4D2D0C", "#3D240C", "#5D350C", "#415120"], "source": "dirt" },
                { "name": "dirt", "tones": ["#8A5D2D", "#6D3D0C", "#9A7141", "#5D350C"], "source": "dirt" },
                { "name": "dry_dirt", "tones": ["#9A7141", "#8A5D2D", "#AA8659", "#6D4D3D"], "source": "dirt" },
                { "name": "scrub_soil", "tones": ["#AA8659", "#9A7141", "#BA9A71", "#5D7139"], "source": "shrub_soil" },
                { "name": "sandy_soil", "tones": ["#BA9A71", "#AA8659", "#CAB292", "#9E928A"], "source": "sand" },
                { "name": "sand", "tones": ["#CAB292", "#BA9A71", "#DBCAB2", "#F7E7A6"], "source": "sand" },
                { "name": "pale_sand", "tones": ["#DBCAB2", "#CAB292", "#EBE3D7", "#F7E7A6"], "source": "sand" }
            ],
            "kinds": {
                "dirt": { "window": [0, 2], "base": 1, "shares": [0.30, 0.50, 0.20] },
                "shrub_soil": { "window": [2, 4], "base": 3, "shares": [0.25, 0.50, 0.25] },
                "sand": { "window": [4, 6], "base": 5, "shares": [0.20, 0.50, 0.30] }
            }
        },
        "clay": {
            "pattern": "stria",
            "steps": [
                { "name": "dark", "tones": ["#8E3D0C", "#7D2D00", "#9E5124", "#612000"], "source": "red_clay" },
                { "name": "red", "tones": ["#AE653D", "#9E5124", "#BE825D", "#7D2D00"], "source": "red_clay" },
                { "name": "orange", "tones": ["#BE825D", "#AE653D", "#CE9A7D", "#9E5124"], "source": "red_clay" },
                { "name": "pale", "tones": ["#CE9A7D", "#BE825D", "#DFBAA2", "#AE653D"], "source": "red_clay" }
            ],
            "kinds": {
                "red_clay": { "window": [0, 3], "base": 1, "shares": [0.20, 0.40, 0.25, 0.15] }
            }
        },
        "stone": {
            "pattern": "cracks",
            "steps": [
                { "name": "gravel", "tones": ["#AEA29A", "#9E928A", "#BEB2AE", "#7D7169"], "source": "stony" },
                { "name": "stony", "tones": ["#9E928A", "#7D7169", "#AEA29A", "#615551"], "source": "stony" },
                { "name": "scree", "tones": ["#6D615D", "#615551", "#7D7169", "#514945"], "source": "scree" },
                { "name": "rock", "tones": ["#7D7D7D", "#616161", "#8E8E8E", "#514945"], "source": "rock" },
                { "name": "dark_rock", "tones": ["#616161", "#515151", "#6D6D6D", "#453D39"], "source": "rock" }
            ],
            "kinds": {
                "stony": { "window": [0, 2], "base": 1, "shares": [0.30, 0.50, 0.20] },
                "scree": { "window": [1, 3], "base": 2, "shares": [0.25, 0.50, 0.25] },
                "rock": { "window": [2, 4], "base": 3, "shares": [0.20, 0.50, 0.30] }
            }
        },
        "mud": {
            "pattern": "mud",
            "steps": [
                { "name": "peat", "tones": ["#352D24", "#241818", "#45352D", "#313D18"], "source": "swamp_mud" },
                { "name": "swamp_mud", "tones": ["#45352D", "#352D24", "#514139", "#39451C"], "source": "swamp_mud" },
                { "name": "mud", "tones": ["#6D4D3D", "#553D31", "#7D6559", "#415120"], "source": "mud" },
                { "name": "dry_mud", "tones": ["#7D6559", "#6D554D", "#8E7565", "#6D4D3D"], "source": "mud" }
            ],
            "kinds": {
                "swamp_mud": { "window": [0, 2], "base": 1, "shares": [0.35, 0.45, 0.20] },
                "mud": { "window": [1, 3], "base": 2, "shares": [0.25, 0.50, 0.25] }
            }
        },
        "tundra": {
            "pattern": "dots",
            "steps": [
                { "name": "tundra", "tones": ["#9EAE7D", "#8A9A61", "#B6C29A", "#CEC6BE"], "source": "tundra" },
                { "name": "frosted", "tones": ["#B6C29A", "#9EAE7D", "#CAD7B6", "#DFD7D2"], "source": "tundra" }
            ],
            "kinds": {
                "tundra": { "window": [0, 1], "base": 0, "shares": [0.60, 0.40] }
            }
        },
        "ash": {
            "pattern": "dots",
            "steps": [
                { "name": "ash", "tones": ["#515151", "#454545", "#616161", "#6D2400"], "source": "ash" },
                { "name": "pale", "tones": ["#616161", "#515151", "#6D6D6D", "#514945"], "source": "ash" }
            ],
            "kinds": {
                "ash": { "window": [0, 1], "base": 0, "shares": [0.65, 0.35] }
            }
        },
        "snow": {
            "pattern": "snow",
            "steps": [
                { "name": "shadowed", "tones": ["#DFDFDF", "#CECEFF", "#EFEFEF", "#BEBEBE"], "source": "snow" },
                { "name": "snow", "tones": ["#EFEFEF", "#DBDBFF", "#FFFFFF", "#CECECE"], "source": "snow" }
            ],
            "kinds": {
                "snow": { "window": [0, 1], "base": 1, "shares": [0.35, 0.65] }
            }
        },
        "ice": {
            "pattern": "ice",
            "steps": [
                { "name": "blue", "tones": ["#B2D7F3", "#71AEE7", "#F3F3FF", "#6DB2E7"], "source": "ice" },
                { "name": "pale", "tones": ["#F3F3FF", "#B2D7F3", "#FFFFFF", "#CECEFF"], "source": "ice" }
            ],
            "kinds": {
                "ice": { "window": [0, 1], "base": 0, "shares": [0.60, 0.40] }
            }
        },
        "blessed": {
            "pattern": "grass",
            "steps": [
                { "name": "flowering", "tones": ["#45B645", "#189218", "#7DDF7D", "#F7E7A6"], "source": "blessed_grass" },
                { "name": "pale", "tones": ["#71864D", "#5D7139", "#9EAE7D", "#F3DF79"], "source": "blessed_grass" }
            ],
            "kinds": {
                "blessed_grass": { "window": [0, 1], "base": 0, "shares": [0.70, 0.30] }
            }
        },
        "cursed": {
            "pattern": "grass",
            "steps": [
                { "name": "blighted", "tones": ["#7D7169", "#615551", "#8E8279", "#6D006D"], "source": "cursed_grass" },
                { "name": "grey", "tones": ["#6D615D", "#514945", "#7D7169", "#610061"], "source": "cursed_grass" }
            ],
            "kinds": {
                "cursed_grass": { "window": [0, 1], "base": 0, "shares": [0.70, 0.30] }
            }
        }
    },
    "pairs": {
        "grass|needles": { "steps": [2, 1] },
        "grass|litter": { "steps": [2, 3] },
        "grass|soil": { "steps": [3, 3] },
        "grass|stone": { "steps": [2, 1] },
        "needles|tundra": { "steps": [1, 0] },
        "litter|soil": { "steps": [3, 1] }
    }
};

// Validate all colors
for (const k of newGroundKinds) {
    for (const c of k.colors) {
        if (!hexSet.has(c.toUpperCase())) throw new Error(`Ground kind ${k.id} color ${c} not in uf.hex`);
    }
    if (k.edge && !hexSet.has(k.edge.toUpperCase())) throw new Error(`Ground kind ${k.id} edge ${k.edge} not in uf.hex`);
}
for (const [fName, fam] of Object.entries(groundShades.families)) {
    for (const s of fam.steps) {
        for (const t of s.tones) {
            if (!hexSet.has(t.toUpperCase())) throw new Error(`Family ${fName} step ${s.name} tone ${t} not in uf.hex`);
        }
    }
}

// Read catalog and update
const raw = fs.readFileSync(catalogPath, "utf8");
const catalog = JSON.parse(raw);

catalog.groundKinds = newGroundKinds;
catalog.groundShades = groundShades;

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");
console.log("Successfully updated UF_WorldCatalog.json with palette-snapped groundKinds and groundShades!");
