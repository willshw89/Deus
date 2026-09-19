"use strict";
const fs = require("fs");
const path = require("path");

const catalogPath = path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
const palettePath = path.resolve(__dirname, "..", "art", "palette", "uf.hex");

const hexLines = fs.readFileSync(palettePath, "utf8").trim().split(/\r?\n/).map(l => l.trim().toUpperCase());
const hexSet = new Set(hexLines);

const groundShades = {
    "about": "VISION V93, docs/design/GROUND_SHADES.md: rolling terrain shades and gradient ramps across all overworld and subterranean biomes.",
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
                { "name": "vivid_emerald", "tones": ["#189218", "#006D00", "#45B645", "#86D200"], "source": "tropical_grass" },
                { "name": "spring_green", "tones": ["#45B645", "#189218", "#7DDF7D", "#86D200"], "source": "tropical_grass" },
                { "name": "lush_clover", "tones": ["#39451C", "#189218", "#45B645", "#71864D"], "source": "meadow" },
                { "name": "deep_meadow", "tones": ["#4D5D28", "#39451C", "#5D7139", "#71864D"], "source": "meadow" },
                { "name": "classic_meadow", "tones": ["#5D7139", "#4D5D28", "#71864D", "#8A9A61"], "source": "meadow" },
                { "name": "warm_meadow", "tones": ["#71864D", "#5D7139", "#8A9A61", "#9EAE7D"], "source": "meadow" },
                { "name": "olive_grass", "tones": ["#697900", "#515900", "#7D9600", "#86B200"], "source": "meadow" },
                { "name": "dry_pasture", "tones": ["#8A9A61", "#71864D", "#9EAE7D", "#B28210"], "source": "dry_grass" },
                { "name": "savanna_grass", "tones": ["#9A7141", "#8A5D2D", "#AA8659", "#C69618"], "source": "dry_grass" },
                { "name": "straw_grass", "tones": ["#C69618", "#B28210", "#DBAE20", "#F3DF79"], "source": "dry_grass" },
                { "name": "earthy_grass", "tones": ["#6D4D3D", "#553D31", "#5D7139", "#4D5D28"], "source": "meadow" },
                { "name": "mossy_grass", "tones": ["#415120", "#313D18", "#4D5D28", "#5D350C"], "source": "meadow" },
                { "name": "frosty_grass", "tones": ["#B6C29A", "#9EAE7D", "#CAD7B6", "#7D7D7D"], "source": "meadow" }
            ],
            "kinds": {
                "tropical_grass": { "window": [0, 4], "base": 0, "shares": [0.35, 0.30, 0.20, 0.10, 0.05] },
                "meadow": { "window": [1, 11], "base": 4, "shares": [0.08, 0.12, 0.15, 0.20, 0.15, 0.10, 0.08, 0.05, 0.04, 0.02, 0.01] },
                "dry_grass": { "window": [6, 9], "base": 9, "shares": [0.15, 0.25, 0.30, 0.30] }
            }
        },
        "litter": {
            "pattern": "litter",
            "steps": [
                { "name": "mossy_humus", "tones": ["#415120", "#313D18", "#5D7139", "#5D350C"], "source": "jungle_floor" },
                { "name": "green_litter", "tones": ["#4D5D28", "#39451C", "#6D4D3D", "#5D7139"], "source": "jungle_floor" },
                { "name": "spring_leaf_bed", "tones": ["#553D31", "#3D2D24", "#71864D", "#5D7139"], "source": "forest_floor" },
                { "name": "damp_loam", "tones": ["#553D31", "#3D2D24", "#6D4D3D", "#5D7139"], "source": "forest_floor" },
                { "name": "rich_leaf_litter", "tones": ["#6D4D3D", "#553D31", "#825D4D", "#9E5124"], "source": "forest_floor" },
                { "name": "autumn_oak_litter", "tones": ["#8A5D2D", "#6D3D0C", "#9E5124", "#AE653D"], "source": "forest_floor" },
                { "name": "golden_beech_duff", "tones": ["#9A7141", "#8A5D2D", "#C69618", "#B28210"], "source": "forest_floor" },
                { "name": "dry_litter", "tones": ["#7D4D18", "#6D3D0C", "#8A5D2D", "#AE653D"], "source": "forest_floor" },
                { "name": "decomposing_bark", "tones": ["#4D2D0C", "#3D240C", "#6D3D0C", "#5D350C"], "source": "forest_floor" },
                { "name": "dark_forest_humus", "tones": ["#3D240C", "#2D1C08", "#4D2D0C", "#553D31"], "source": "forest_floor" }
            ],
            "kinds": {
                "jungle_floor": { "window": [0, 4], "base": 1, "shares": [0.25, 0.35, 0.25, 0.15] },
                "forest_floor": { "window": [1, 9], "base": 4, "shares": [0.10, 0.15, 0.25, 0.20, 0.10, 0.10, 0.05, 0.05] }
            }
        },
        "needles": {
            "pattern": "needles",
            "steps": [
                { "name": "mossy_needles", "tones": ["#415120", "#313D18", "#5D7139", "#5D350C"], "source": "needle_floor" },
                { "name": "fresh_spruce_needles", "tones": ["#39451C", "#283114", "#4D5D28", "#6D3D0C"], "source": "needle_floor" },
                { "name": "pine_needles", "tones": ["#4D5D28", "#39451C", "#5D350C", "#7D4D18"], "source": "needle_floor" },
                { "name": "amber_pine_duff", "tones": ["#5D350C", "#4D2D0C", "#7D4D18", "#8A5D2D"], "source": "needle_floor" },
                { "name": "dry_amber_needles", "tones": ["#7D4D18", "#6D3D0C", "#8A5D2D", "#9A7141"], "source": "needle_floor" },
                { "name": "rich_rust_needles", "tones": ["#8E3D0C", "#7D2D00", "#9E5124", "#612000"], "source": "needle_floor" },
                { "name": "dark_conifer_loam", "tones": ["#4D2D0C", "#3D240C", "#5D350C", "#7D4D18"], "source": "needle_floor" },
                { "name": "snow_dusted_needles", "tones": ["#9E928A", "#7D7169", "#4D5D28", "#CECECE"], "source": "needle_floor" }
            ],
            "kinds": {
                "needle_floor": { "window": [0, 7], "base": 2, "shares": [0.15, 0.25, 0.30, 0.10, 0.10, 0.05, 0.03, 0.02] }
            }
        },
        "soil": {
            "pattern": "dots",
            "steps": [
                { "name": "mossy_dirt", "tones": ["#4D5D28", "#39451C", "#6D4D3D", "#5D7139"], "source": "dirt" },
                { "name": "moist_black_loam", "tones": ["#3D240C", "#2D1C08", "#4D2D0C", "#415120"], "source": "dirt" },
                { "name": "loam", "tones": ["#4D2D0C", "#3D240C", "#5D350C", "#415120"], "source": "dirt" },
                { "name": "rich_dirt", "tones": ["#6D3D0C", "#5D350C", "#8A5D2D", "#4D2D0C"], "source": "dirt" },
                { "name": "dirt", "tones": ["#8A5D2D", "#6D3D0C", "#9A7141", "#5D350C"], "source": "dirt" },
                { "name": "dry_dirt", "tones": ["#9A7141", "#8A5D2D", "#AA8659", "#6D4D3D"], "source": "dirt" },
                { "name": "scrub_soil", "tones": ["#AA8659", "#9A7141", "#BA9A71", "#71864D"], "source": "shrub_soil" },
                { "name": "pebble_scrub", "tones": ["#BA9A71", "#AA8659", "#9E928A", "#7D7169"], "source": "shrub_soil" },
                { "name": "savanna_soil", "tones": ["#BA9A71", "#AA8659", "#CAB292", "#9A7141"], "source": "sand" },
                { "name": "sandy_soil", "tones": ["#CAB292", "#BA9A71", "#DBCAB2", "#AA8659"], "source": "sand" },
                { "name": "sand", "tones": ["#CAB292", "#BA9A71", "#DBCAB2", "#F7E7A6"], "source": "sand" },
                { "name": "pale_sand", "tones": ["#DBCAB2", "#CAB292", "#EBE3D7", "#F7E7A6"], "source": "sand" }
            ],
            "kinds": {
                "dirt": { "window": [0, 5], "base": 4, "shares": [0.10, 0.15, 0.25, 0.30, 0.15, 0.05] },
                "shrub_soil": { "window": [4, 8], "base": 6, "shares": [0.10, 0.25, 0.35, 0.20, 0.10] },
                "sand": { "window": [7, 11], "base": 10, "shares": [0.10, 0.25, 0.35, 0.20, 0.10] }
            }
        },
        "clay": {
            "pattern": "stria",
            "steps": [
                { "name": "dark_ferric_clay", "tones": ["#7D2D00", "#612000", "#8E3D0C", "#4D2400"], "source": "red_clay" },
                { "name": "terracotta_loam", "tones": ["#8E3D0C", "#7D2D00", "#9E5124", "#612000"], "source": "red_clay" },
                { "name": "red_clay", "tones": ["#AE653D", "#9E5124", "#BE825D", "#7D2D00"], "source": "red_clay" },
                { "name": "sunbaked_clay", "tones": ["#BE825D", "#AE653D", "#CAB292", "#9E5124"], "source": "red_clay" },
                { "name": "ochre_shale", "tones": ["#CAB292", "#BE825D", "#DBCAB2", "#AE653D"], "source": "red_clay" },
                { "name": "rust_gravel", "tones": ["#9E5124", "#8E3D0C", "#9E928A", "#7D7169"], "source": "red_clay" },
                { "name": "cracked_caliche", "tones": ["#DBCAB2", "#CAB292", "#BE825D", "#F7E7A6"], "source": "red_clay" },
                { "name": "purple_red_shale", "tones": ["#8A4500", "#6D3500", "#612000", "#512400"], "source": "red_clay" }
            ],
            "kinds": {
                "red_clay": { "window": [0, 7], "base": 2, "shares": [0.10, 0.20, 0.35, 0.15, 0.10, 0.05, 0.03, 0.02] }
            }
        },
        "stone": {
            "pattern": "cracks",
            "steps": [
                { "name": "mossy_stone", "tones": ["#71864D", "#5D7139", "#7D7169", "#514945"], "source": "stony" },
                { "name": "weathered_slate", "tones": ["#7D7169", "#615551", "#8E8279", "#514945"], "source": "stony" },
                { "name": "river_pebbles", "tones": ["#8E8279", "#7D7169", "#9E928A", "#615551"], "source": "stony" },
                { "name": "stony", "tones": ["#9E928A", "#7D7169", "#AEA29A", "#615551"], "source": "stony" },
                { "name": "scree", "tones": ["#6D615D", "#615551", "#7D7169", "#514945"], "source": "scree" },
                { "name": "granite_rock", "tones": ["#7D7D7D", "#616161", "#8E8E8E", "#514945"], "source": "rock" },
                { "name": "blue_grey_bedrock", "tones": ["#6D6D6D", "#515151", "#7D7D7D", "#454545"], "source": "rock" },
                { "name": "dark_basalt", "tones": ["#515151", "#454545", "#616161", "#353535"], "source": "rock" },
                { "name": "iron_streaked_rock", "tones": ["#615551", "#514945", "#8E3D0C", "#35312D"], "source": "peak_rock" },
                { "name": "peak_rock", "tones": ["#515151", "#453D39", "#6D6D6D", "#35312D"], "source": "peak_rock" }
            ],
            "kinds": {
                "stony": { "window": [0, 4], "base": 3, "shares": [0.15, 0.25, 0.35, 0.15, 0.10] },
                "scree": { "window": [2, 6], "base": 4, "shares": [0.15, 0.30, 0.35, 0.15, 0.05] },
                "rock": { "window": [4, 8], "base": 5, "shares": [0.10, 0.35, 0.35, 0.15, 0.05] },
                "peak_rock": { "window": [6, 9], "base": 9, "shares": [0.15, 0.25, 0.30, 0.30] }
            }
        },
        "mud": {
            "pattern": "mud",
            "steps": [
                { "name": "algae_mud", "tones": ["#415120", "#313D18", "#45352D", "#39451C"], "source": "swamp_mud" },
                { "name": "deep_bog_mud", "tones": ["#352D24", "#2D1C08", "#45352D", "#39451C"], "source": "swamp_mud" },
                { "name": "swamp_mud", "tones": ["#45352D", "#352D24", "#514139", "#39451C"], "source": "swamp_mud" },
                { "name": "wet_silt", "tones": ["#553D31", "#45352D", "#6D4D3D", "#415120"], "source": "mud" },
                { "name": "mud", "tones": ["#6D4D3D", "#553D31", "#7D6559", "#415120"], "source": "mud" },
                { "name": "riverbank_mud", "tones": ["#7D6559", "#6D4D3D", "#8A5D2D", "#5D7139"], "source": "mud" },
                { "name": "peat_mire", "tones": ["#4D2D0C", "#3D240C", "#45352D", "#352D24"], "source": "mud" },
                { "name": "black_muck", "tones": ["#2D1C08", "#180800", "#352D24", "#313D18"], "source": "mud" }
            ],
            "kinds": {
                "swamp_mud": { "window": [0, 4], "base": 2, "shares": [0.15, 0.35, 0.35, 0.10, 0.05] },
                "mud": { "window": [2, 7], "base": 4, "shares": [0.10, 0.25, 0.35, 0.15, 0.10, 0.05] }
            }
        },
        "tundra": {
            "pattern": "dots",
            "steps": [
                { "name": "mossy_tundra", "tones": ["#9EAE7D", "#8A9A61", "#7D7169", "#615551"], "source": "tundra" },
                { "name": "reindeer_lichen", "tones": ["#9EAE7D", "#8A9A61", "#B6C29A", "#CEC6BE"], "source": "tundra" },
                { "name": "tundra_bog", "tones": ["#71864D", "#5D7139", "#553D31", "#45352D"], "source": "tundra" },
                { "name": "frost_heaved_gravel", "tones": ["#B6C29A", "#9EAE7D", "#9E928A", "#7D7169"], "source": "tundra" },
                { "name": "tundra_turf", "tones": ["#8A9A61", "#71864D", "#9EAE7D", "#616161"], "source": "tundra" },
                { "name": "pale_tundra", "tones": ["#B6C29A", "#9EAE7D", "#CAD7B6", "#AEAEAE"], "source": "tundra" },
                { "name": "frozen_peat", "tones": ["#553D31", "#45352D", "#6D615D", "#9E9E9E"], "source": "tundra" },
                { "name": "permafrost_crust", "tones": ["#CAD7B6", "#B6C29A", "#CECECE", "#DFDFDF"], "source": "tundra" }
            ],
            "kinds": {
                "tundra": { "window": [0, 7], "base": 1, "shares": [0.10, 0.25, 0.20, 0.15, 0.10, 0.10, 0.05, 0.05] }
            }
        },
        "ash": {
            "pattern": "dots",
            "steps": [
                { "name": "dark_ash", "tones": ["#454545", "#353535", "#515151", "#510000"], "source": "ash" },
                { "name": "ash", "tones": ["#515151", "#454545", "#616161", "#6D2400"], "source": "ash" },
                { "name": "cinder", "tones": ["#616161", "#515151", "#7D7D7D", "#8A4500"], "source": "ash" }
            ],
            "kinds": {
                "ash": { "window": [0, 2], "base": 1, "shares": [0.25, 0.50, 0.25] }
            }
        },
        "snow": {
            "pattern": "snow",
            "steps": [
                { "name": "crust_snow", "tones": ["#CECECE", "#BEBEBE", "#DFDFDF", "#BABAFF"], "source": "snow" },
                { "name": "snow", "tones": ["#EFEFEF", "#DBDBFF", "#FFFFFF", "#CECECE"], "source": "snow" },
                { "name": "powder", "tones": ["#FFFFFF", "#EFEFEF", "#FFFFFF", "#DBDBFF"], "source": "snow" },
                { "name": "firn", "tones": ["#DFDFDF", "#CECECE", "#EFEFEF", "#BABAFF"], "source": "snow" }
            ],
            "kinds": {
                "snow": { "window": [0, 3], "base": 1, "shares": [0.20, 0.50, 0.20, 0.10] }
            }
        },
        "ice": {
            "pattern": "ice",
            "steps": [
                { "name": "deep_abyssal_ice", "tones": ["#0000A6", "#00008A", "#358EDB", "#006DD2"], "source": "ice" },
                { "name": "deep_ice", "tones": ["#71AEE7", "#358EDB", "#6DB2E7", "#006DD2"], "source": "ice" },
                { "name": "ice", "tones": ["#B2D7F3", "#71AEE7", "#F3F3FF", "#6DB2E7"], "source": "ice" },
                { "name": "glaze", "tones": ["#F3F3FF", "#B2D7F3", "#FFFFFF", "#71AEE7"], "source": "ice" }
            ],
            "kinds": {
                "ice": { "window": [0, 3], "base": 2, "shares": [0.15, 0.35, 0.35, 0.15] }
            }
        },
        "blessed": {
            "pattern": "grass",
            "steps": [
                { "name": "flowering", "tones": ["#45B645", "#189218", "#7DDF7D", "#F7E7A6"], "source": "blessed_grass" },
                { "name": "bright", "tones": ["#7DDF7D", "#45B645", "#DBFFDB", "#FFFFFF"], "source": "blessed_grass" }
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
        },
        "cave_floor": {
            "pattern": "cracks",
            "steps": [
                { "name": "cave_moss", "tones": ["#415120", "#313D18", "#515100", "#454545"], "source": "stony" },
                { "name": "damp_cave_dirt", "tones": ["#45352D", "#352D24", "#514139", "#35312D"], "source": "dirt" },
                { "name": "cave_stone", "tones": ["#515151", "#454545", "#616161", "#353535"], "source": "stony" },
                { "name": "pale_limestone", "tones": ["#7D7169", "#615551", "#8E8279", "#514945"], "source": "stony" }
            ],
            "kinds": {
                "stony": { "window": [0, 3], "base": 2, "shares": [0.25, 0.25, 0.30, 0.20] }
            }
        },
        "mycelium": {
            "pattern": "dots",
            "steps": [
                { "name": "biolum_blue", "tones": ["#0000A6", "#00006D", "#358EDB", "#71AEE7"], "source": "cursed_grass" },
                { "name": "biolum_purple", "tones": ["#6D006D", "#510051", "#8E108E", "#B249B2"], "source": "cursed_grass" },
                { "name": "spore_loam", "tones": ["#45352D", "#352D24", "#610061", "#510051"], "source": "dirt" },
                { "name": "fungal_turf", "tones": ["#352D24", "#2D1C08", "#6D006D", "#352D24"], "source": "dirt" }
            ],
            "kinds": {
                "cursed_grass": { "window": [0, 3], "base": 1, "shares": [0.25, 0.25, 0.25, 0.25] }
            }
        }
    },
    "pairs": {
        "grass|litter": { "steps": [10, 1] },
        "grass|needles": { "steps": [11, 0] },
        "grass|soil": { "steps": [10, 0] },
        "grass|stone": { "steps": [10, 0] },
        "grass|tundra": { "steps": [12, 0] },
        "grass|mud": { "steps": [11, 3] },
        "litter|soil": { "steps": [3, 2] },
        "litter|needles": { "steps": [0, 0] },
        "soil|stone": { "steps": [7, 0] },
        "soil|clay": { "steps": [4, 1] },
        "tundra|snow": { "steps": [7, 0] }
    }
};

// Check palette compliance
let allOk = true;
let toneCount = 0;
for (const [famName, fam] of Object.entries(groundShades.families)) {
    for (const step of fam.steps) {
        for (const c of step.tones) {
            toneCount++;
            if (!hexSet.has(c.toUpperCase())) {
                console.error(`FAIL: ${famName}.${step.name} color ${c} not in uf.hex`);
                allOk = false;
            }
        }
    }
}

if (!allOk) {
    console.error("Aborting catalog update due to off-palette colors.");
    process.exit(1);
}

console.log(`Validated ${toneCount} tones across ${Object.keys(groundShades.families).length} families: 100% compliant with uf.hex!`);

const raw = fs.readFileSync(catalogPath, "utf8");
const cat = JSON.parse(raw);
cat.groundShades = groundShades;

fs.writeFileSync(catalogPath, JSON.stringify(cat, null, 2) + "\n", "utf8");
console.log("Successfully updated UF_WorldCatalog.json with full multi-biome and subterranean groundShades!");
