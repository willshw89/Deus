// tools/update_materials_catalog.js - Updates catalog.materials in game/data/UF_WorldCatalog.json
// Supports --dry-run and --apply with full pre- and post-validation.
"use strict";

const fs = require("fs");
const path = require("path");
const { validateMaterials } = require("./validate_materials");

const catalogPath = path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
const isDryRun = process.argv.includes("--dry-run");
const isApply = process.argv.includes("--apply");

const NEW_MATERIALS = {
    about: "Physical material properties registry for Project DEUS systemic economy (Woods, Stones, Metals, Aliases).",
    version: 2,
    woods: {
        pine: {
            name: "Pine",
            category: "softwood",
            density: 0.45,
            structuralStrength: 40,
            hardness: 2,
            flexibility: 45,
            workability: 85,
            rotResistance: 30,
            burnQuality: 80,
            insulation: 70,
            beauty: 40,
            rarity: 10,
            color: "#D4A373",
            tags: ["common", "construction", "fuel", "softwood"]
        },
        birch: {
            name: "Birch",
            category: "hardwood",
            density: 0.65,
            structuralStrength: 60,
            hardness: 4,
            flexibility: 50,
            workability: 75,
            rotResistance: 35,
            burnQuality: 85,
            insulation: 65,
            beauty: 65,
            rarity: 20,
            color: "#E8D8C8",
            tags: ["bark_craft", "firewood", "furniture"]
        },
        oak: {
            name: "Oak",
            category: "hardwood",
            density: 0.75,
            structuralStrength: 80,
            hardness: 6,
            flexibility: 30,
            workability: 50,
            rotResistance: 75,
            burnQuality: 95,
            insulation: 85,
            beauty: 70,
            rarity: 35,
            color: "#8B5A2B",
            tags: ["durable", "beams", "doors", "shields", "tannin"]
        },
        ash: {
            name: "Ash",
            category: "hardwood",
            density: 0.68,
            structuralStrength: 75,
            hardness: 5,
            flexibility: 85,
            workability: 65,
            rotResistance: 40,
            burnQuality: 70,
            insulation: 60,
            beauty: 60,
            rarity: 40,
            color: "#C2B280",
            tags: ["shafts", "handles", "bows", "elastic"]
        },
        willow: {
            name: "Willow",
            category: "softwood",
            density: 0.42,
            structuralStrength: 35,
            hardness: 2,
            flexibility: 90,
            workability: 80,
            rotResistance: 25,
            burnQuality: 50,
            insulation: 55,
            beauty: 50,
            rarity: 30,
            color: "#A2B88C",
            tags: ["weaving", "baskets", "reeds", "moist"]
        },
        elm: {
            name: "Elm",
            category: "hardwood",
            density: 0.60,
            structuralStrength: 70,
            hardness: 5,
            flexibility: 60,
            workability: 55,
            rotResistance: 50,
            burnQuality: 75,
            insulation: 65,
            beauty: 60,
            rarity: 50,
            color: "#7E6A56",
            tags: ["tough", "hubs", "water_pipes"]
        },
        yew: {
            name: "Yew",
            category: "conifer_hardwood",
            density: 0.67,
            structuralStrength: 85,
            hardness: 6,
            flexibility: 98,
            workability: 40,
            rotResistance: 80,
            burnQuality: 60,
            insulation: 50,
            beauty: 85,
            rarity: 80,
            color: "#A0522D",
            tags: ["master_bows", "prestige", "rare"]
        }
    },
    stones: {
        limestone: {
            name: "Limestone",
            category: "sedimentary",
            density: 2.3,
            compressiveStrength: 55,
            fractureResistance: 40,
            workability: 80,
            weatherResistance: 50,
            heatResistance: 60,
            beauty: 55,
            rarity: 20,
            color: "#E3DAC9",
            tags: ["masonry", "quicklime", "plaster", "soft_stone"]
        },
        sandstone: {
            name: "Sandstone",
            category: "sedimentary",
            density: 2.1,
            compressiveStrength: 45,
            fractureResistance: 35,
            workability: 90,
            weatherResistance: 45,
            heatResistance: 70,
            beauty: 60,
            rarity: 20,
            color: "#D2B48C",
            tags: ["fast_construction", "carving", "arid"]
        },
        granite: {
            name: "Granite",
            category: "igneous_intrusive",
            density: 2.75,
            compressiveStrength: 95,
            fractureResistance: 85,
            workability: 25,
            weatherResistance: 95,
            heatResistance: 90,
            beauty: 75,
            rarity: 50,
            color: "#696969",
            tags: ["fortifications", "heavy_work", "durable", "hard_stone"]
        },
        basalt: {
            name: "Basalt",
            category: "igneous_extrusive",
            density: 2.9,
            compressiveStrength: 90,
            fractureResistance: 80,
            workability: 30,
            weatherResistance: 90,
            heatResistance: 98,
            beauty: 65,
            rarity: 45,
            color: "#2B2B2B",
            tags: ["volcanic", "thermal", "paving"]
        },
        slate: {
            name: "Slate",
            category: "metamorphic",
            density: 2.65,
            compressiveStrength: 65,
            fractureResistance: 70,
            workability: 75,
            weatherResistance: 90,
            heatResistance: 50,
            beauty: 70,
            rarity: 40,
            color: "#2F4F4F",
            tags: ["roofing", "flooring", "tablets", "cleavage"]
        },
        marble: {
            name: "Marble",
            category: "metamorphic",
            density: 2.7,
            compressiveStrength: 70,
            fractureResistance: 50,
            workability: 60,
            weatherResistance: 65,
            heatResistance: 65,
            beauty: 98,
            rarity: 75,
            color: "#F8F8FF",
            tags: ["prestige", "sculpture", "temples", "luxury"]
        }
    },
    metals: {
        copper: {
            name: "Copper",
            density: 8.96,
            hardness: 3.0,
            toughness: 60,
            edgeRetention: 35,
            ductility: 90,
            corrosionResistance: 80,
            meltingPointBeats: 1084,
            fuelRequirement: 40,
            rarity: 25,
            value: 4,
            color: "#B87333",
            tags: ["early_metal", "bronze_component", "malleable"]
        },
        tin: {
            name: "Tin",
            density: 7.31,
            hardness: 1.5,
            toughness: 30,
            edgeRetention: 15,
            ductility: 70,
            corrosionResistance: 85,
            meltingPointBeats: 232,
            fuelRequirement: 20,
            rarity: 60,
            value: 8,
            color: "#D3D3D3",
            tags: ["bronze_component", "soldering", "soft_metal"]
        },
        bronze: {
            name: "Bronze",
            density: 8.7,
            hardness: 5.5,
            toughness: 75,
            edgeRetention: 65,
            ductility: 65,
            corrosionResistance: 90,
            meltingPointBeats: 950,
            fuelRequirement: 50,
            rarity: 45,
            value: 14,
            color: "#CD7F32",
            tags: ["weapons", "armor", "bells", "alloy"]
        },
        iron: {
            name: "Iron",
            density: 7.87,
            hardness: 4.5,
            toughness: 70,
            edgeRetention: 55,
            ductility: 50,
            corrosionResistance: 30,
            meltingPointBeats: 1538,
            fuelRequirement: 85,
            rarity: 35,
            value: 10,
            color: "#708090",
            tags: ["structural", "weapons", "tools", "ferrous"]
        },
        steel: {
            name: "Steel",
            density: 7.85,
            hardness: 7.5,
            toughness: 90,
            edgeRetention: 90,
            ductility: 55,
            corrosionResistance: 50,
            meltingPointBeats: 1500,
            fuelRequirement: 120,
            rarity: 70,
            value: 28,
            color: "#4682B4",
            tags: ["master_weapons", "master_armor", "heavy_duty", "ferrous"]
        },
        silver: {
            name: "Silver",
            density: 10.49,
            hardness: 2.8,
            toughness: 50,
            edgeRetention: 20,
            ductility: 95,
            corrosionResistance: 90,
            meltingPointBeats: 961,
            fuelRequirement: 40,
            rarity: 70,
            value: 30,
            color: "#C0C0C0",
            tags: ["prestige", "currency", "ornament", "precious"]
        },
        gold: {
            name: "Gold",
            density: 19.32,
            hardness: 2.5,
            toughness: 40,
            edgeRetention: 10,
            ductility: 98,
            corrosionResistance: 99,
            meltingPointBeats: 1064,
            fuelRequirement: 45,
            rarity: 85,
            value: 50,
            color: "#FFD700",
            tags: ["currency", "ornament", "prestige", "precious"]
        }
    },
    aliases: {
        wood: "woods:oak",
        stone: "stones:limestone",
        iron: "metals:iron",
        copper: "metals:copper",
        bronze: "metals:bronze"
    }
};

// Validate the payload in memory first
const testCatalog = { materials: NEW_MATERIALS };
const preCheck = validateMaterials(testCatalog);
if (!preCheck.ok) {
    console.error("Payload validation failed:");
    for (const err of preCheck.errors) {
        console.error(`  - ${err}`);
    }
    process.exit(1);
}
console.log(`Payload pre-check PASSED: ${preCheck.counts.woods} woods, ${preCheck.counts.stones} stones, ${preCheck.counts.metals} metals, ${preCheck.counts.aliases} aliases.`);

if (isDryRun || !isApply) {
    console.log("Dry-run complete. Run with --apply to write to game/data/UF_WorldCatalog.json.");
    process.exit(0);
}

// Load real catalog, replace materials, and write back
const raw = fs.readFileSync(catalogPath, "utf8");
const catalog = JSON.parse(raw);
catalog.materials = NEW_MATERIALS;

const updatedJson = JSON.stringify(catalog, null, 2);
fs.writeFileSync(catalogPath, updatedJson, "utf8");

// Post-check on disk
const postCheck = validateMaterials(catalogPath);
if (!postCheck.ok) {
    console.error("FAIL: Post-write validation failed!");
    process.exit(1);
}
console.log(`SUCCESS: game/data/UF_WorldCatalog.json updated and verified cleanly.`);
process.exit(0);

