const fs = require("fs");
const path = require("path");

const catalogPath = path.join(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
const cat = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// 1. Update version and about
cat.version = 3;
cat.about = "Master world catalog. Declares every terrain, object, item, wildlife species, faction, and UI element with exact image filenames, AR-xxx request IDs, and asset statuses. Read by UF_WorldGen, UF_Tiles, UF_Factions, UF_Wildlife, UF_ColonyOverseer.";

// 2. Update terrain
cat.terrain = {
    grass: {
        name: "Meadow grass",
        tileId: 2816,
        image: "U7_Outside_A2.png",
        requestId: "AR-001",
        status: "U7 stand-in",
        autotile: false,
        about: "Seamless U7 meadow grass (Outside A2 autotile kind 0)"
    },
    water: {
        name: "River water",
        tileId: 2048,
        image: "Outside_A1.png",
        requestId: "AR-001",
        status: "U7 stand-in",
        autotile: true,
        about: "Fresh water with bank autotiles (Outside A1 kind 0)"
    }
};

// 3. Update tilesets (surface only, subterranean retired 2026-09-18)
cat.tilesets = {
    about: "Master U7 2.5D surface tilesets.",
    surface: { A1: "Outside_A1", A2: "Outside_A2", B: "Outside_B", "C": "Outside_C" }
};

// 4. Update groundKinds with image, requestId, status
for (const g of cat.groundKinds) {
    if (g.id === "meadow") {
        g.image = "U7_Outside_A2.png";
        g.requestId = "AR-001";
        g.status = "U7 stand-in";
    } else {
        g.image = "UF_Tiles_Procedural";
        g.requestId = "AR-100";
        g.status = "code-drawn placeholder";
    }
}

// 5. Update water
cat.water = {
    about: "Water kinds by tile ID (A1 autotiles; edges computed). Surface IDs are in Outside_A1.",
    surface: {
        fresh: { id: "fresh", name: "Fresh water", tileId: 2048, image: "Outside_A1.png", requestId: "AR-001", status: "U7 stand-in" },
        pond: { id: "pond", name: "Pond water", tileId: 2096, image: "Outside_A1.png", requestId: "AR-101", status: "U7 stand-in" },
        marsh: { id: "marsh", name: "Marsh water", tileId: 2144, image: "Outside_A1.png", requestId: "AR-101", status: "U7 stand-in" },
        swamp: { id: "swamp", name: "Swamp water", tileId: 2192, image: "Outside_A1.png", requestId: "AR-101", status: "U7 stand-in" },
        icy: { id: "icy", name: "Icy water", tileId: 2240, image: "Outside_A1.png", requestId: "AR-101", status: "U7 stand-in" },
        brackish: { id: "brackish", name: "Brackish water", tileId: 2432, image: "Outside_A1.png", requestId: "AR-101", status: "U7 stand-in" },
        salt: { id: "salt", name: "Salt water", tileId: 2528, image: "Outside_A1.png", requestId: "AR-101", status: "U7 stand-in" },
        deep: { id: "deep", name: "Deep ocean", tileId: 2624, image: "Outside_A1.png", requestId: "AR-101", status: "U7 stand-in" },
        blighted: { id: "blighted", name: "Blighted water", tileId: 2720, image: "Outside_A1.png", requestId: "AR-101", status: "U7 stand-in" }
    }
};

// 6. Remove cavern biomes from biomes (subterranean level retired by user)
const surfaceBiomes = {};
for (const [k, v] of Object.entries(cat.biomes)) {
    if (!v.layer || v.layer === 0) {
        surfaceBiomes[k] = v;
    }
}
cat.biomes = surfaceBiomes;

// 7. Update start colonists
if (cat.start && cat.start.events) {
    cat.start.events[0].requestId = "AR-010";
    cat.start.events[0].status = "U7 stand-in";
    cat.start.events[1].requestId = "AR-011";
    cat.start.events[1].status = "U7 stand-in";
}

// 8. Update objects with requestId and status
const objRequests = {
    oak: "AR-021",
    pine: "AR-021",
    fruit_tree: "AR-020",
    tree_savanna: "AR-102",
    tree_swamp: "AR-102",
    tree_tropical: "AR-102",
    dead_tree: "AR-102",
    berry_bush: "AR-023",
    bush: "AR-023",
    grass_tuft: "AR-103",
    reeds: "AR-103",
    flowers: "AR-103",
    rocks_small: "AR-103",
    granite_boulder: "AR-022",
    ironstone: "AR-022",
    cave_ironstone: "AR-044",
    cave_boulder: "AR-044",
    crystal: "AR-103",
    crystal_small: "AR-103",
    gravel: "AR-103",
    bones: "AR-103"
};

for (const o of cat.objects) {
    o.requestId = objRequests[o.id] || "AR-103";
    o.status = "U7 stand-in";
}

// Add tree_stump and campfire if not present
if (!cat.objects.some(o => o.id === "tree_stump")) {
    cat.objects.push({
        id: "tree_stump",
        name: "Felled tree stump",
        image: "!$TreeStump",
        note: "<harvestable> <resource: wood>",
        density: 0,
        avoidWater: 1,
        requestId: "AR-021",
        status: "U7 stand-in"
    });
}
if (!cat.objects.some(o => o.id === "campfire")) {
    cat.objects.push({
        id: "campfire",
        name: "Campfire hearth",
        image: "!$Campfire",
        note: "<fire> <light: 5> <warmth>",
        density: 0,
        avoidWater: 1,
        requestId: "AR-300",
        status: "U7 stand-in"
    });
}

// 9. Add 23 loose ground items (AR-200)
cat.items = [
    { id: "wood_log", name: "Wood log", image: "!$U7_Item_WoodLog", category: "wood", requestId: "AR-200", status: "U7 stand-in" },
    { id: "firewood", name: "Firewood", image: "!$U7_Item_Firewood", category: "fuel", requestId: "AR-200", status: "U7 stand-in" },
    { id: "rough_stone", name: "Rough stone", image: "!$U7_Item_RoughStone", category: "stone", requestId: "AR-200", status: "U7 stand-in" },
    { id: "iron_ore", name: "Iron ore", image: "!$U7_Item_IronOre", category: "ore", requestId: "AR-200", status: "U7 stand-in" },
    { id: "lead_ore", name: "Lead ore", image: "!$U7_Item_LeadOre", category: "ore", requestId: "AR-200", status: "U7 stand-in" },
    { id: "blackrock", name: "Blackrock", image: "!$U7_Item_Blackrock", category: "special", requestId: "AR-200", status: "U7 stand-in" },
    { id: "gold_nugget", name: "Gold nugget", image: "!$U7_Item_GoldNugget", category: "metal", requestId: "AR-200", status: "U7 stand-in" },
    { id: "metal_bar", name: "Metal bar", image: "!$U7_Item_MetalBar", category: "refined", requestId: "AR-200", status: "U7 stand-in" },
    { id: "rough_gem", name: "Rough gem", image: "!$U7_Item_RoughGem", category: "gem", requestId: "AR-200", status: "U7 stand-in" },
    { id: "cut_gem", name: "Cut gem", image: "!$U7_Item_CutGem", category: "gem", requestId: "AR-200", status: "U7 stand-in" },
    { id: "plant_fiber", name: "Plant fiber", image: "!$U7_Item_PlantFiber", category: "fiber", requestId: "AR-200", status: "U7 stand-in" },
    { id: "wool_fleece", name: "Wool fleece", image: "!$U7_Item_WoolFleece", category: "fiber", requestId: "AR-200", status: "U7 stand-in" },
    { id: "straw_bundle", name: "Straw bundle", image: "!$U7_Item_StrawBundle", category: "fiber", requestId: "AR-200", status: "U7 stand-in" },
    { id: "seed_pouch", name: "Seed pouch", image: "!$U7_Item_SeedPouch", category: "agriculture", requestId: "AR-200", status: "U7 stand-in" },
    { id: "wild_berries", name: "Wild berries", image: "!$U7_Item_WildBerries", category: "food", requestId: "AR-200", status: "U7 stand-in" },
    { id: "tree_fruit", name: "Tree fruit", image: "!$U7_Item_TreeFruit", category: "food", requestId: "AR-200", status: "U7 stand-in" },
    { id: "cave_mushroom", name: "Mushroom", image: "!$U7_Item_CaveMushroom", category: "food", requestId: "AR-200", status: "U7 stand-in" },
    { id: "root_vegetable", name: "Root vegetable", image: "!$U7_Item_RootVegetable", category: "food", requestId: "AR-200", status: "U7 stand-in" },
    { id: "raw_meat", name: "Raw meat", image: "!$U7_Item_RawMeat", category: "food", requestId: "AR-200", status: "U7 stand-in" },
    { id: "haunch_meat", name: "Haunch meat", image: "!$U7_Item_HaunchMeat", category: "food", requestId: "AR-200", status: "U7 stand-in" },
    { id: "river_fish", name: "River fish", image: "!$U7_Item_RiverFish", category: "food", requestId: "AR-200", status: "U7 stand-in" },
    { id: "animal_bone", name: "Animal bone", image: "!$U7_Item_AnimalBone", category: "bone", requestId: "AR-200", status: "U7 stand-in" },
    { id: "leather_hide", name: "Leather hide", image: "!$U7_Item_LeatherHide", category: "leather", requestId: "AR-200", status: "U7 stand-in" }
];

// 10. Update wildlife species with delivered U7 assets
cat.wildlife = {
    about: "Wildlife and creatures placed with the map on New Game (UF_Wildlife). All use authentic 2.5D U7 stand-ins.",
    species: [
        { id: "wolf", name: "Wolf", image: "$U7_Wolf", herd: [2, 4], wander: 14, note: "<creature> <predator>", requestId: "AR-401", status: "U7 stand-in", biomes: { taiga: 3, tundra: 2, forest_temperate_conifer: 2, forest_temperate_broadleaf: 1, mountain: 1, grassland_temperate: 0.5 } },
        { id: "wildcat", name: "Wildcat", image: "$U7_Cat", herd: [1, 1], wander: 10, note: "<creature> <predator>", requestId: "AR-401", status: "U7 stand-in", biomes: { forest_temperate_broadleaf: 2, forest_tropical_moist_broadleaf: 3, shrubland_temperate: 2, shrubland_tropical: 2, forest_tropical_dry_broadleaf: 2 } },
        { id: "boar", name: "Boar", image: "$U7_Ox", herd: [2, 5], wander: 12, note: "<creature> <grazer> <meat>", requestId: "AR-401", status: "U7 stand-in", biomes: { forest_temperate_broadleaf: 3, grassland_temperate: 2, forest_tropical_dry_broadleaf: 2, savanna_temperate: 2, swamp_temperate_fresh: 1 } },
        { id: "fowl", name: "Wild fowl", image: "$U7_Chicken", herd: [3, 6], wander: 8, note: "<creature> <grazer> <meat> <eggs>", requestId: "AR-401", status: "U7 stand-in", biomes: { grassland_temperate: 3, grassland_tropical: 3, savanna_tropical: 2, marsh_temperate_fresh: 3, marsh_tropical_fresh: 3, shrubland_temperate: 1 } },
        { id: "hare", name: "Hare", image: "$U7_Hare", herd: [2, 6], wander: 8, note: "<creature> <grazer> <small>", requestId: "AR-401", status: "U7 stand-in", biomes: { grassland_temperate: 4, shrubland_temperate: 3, tundra: 2 } },
        { id: "fox", name: "Fox", image: "$U7_Fox", herd: [1, 2], wander: 12, note: "<creature> <predator>", requestId: "AR-401", status: "U7 stand-in", biomes: { forest_temperate_broadleaf: 2, taiga: 2, grassland_temperate: 1 } },
        { id: "dog", name: "Hound", image: "$U7_Dog", herd: [1, 3], wander: 10, note: "<creature> <domestic>", requestId: "AR-403", status: "U7 stand-in", biomes: { grassland_temperate: 1 } },
        { id: "hawk", name: "Hawk", image: "$U7_Hawk", herd: [1, 1], wander: 16, note: "<creature> <bird>", requestId: "AR-401", status: "U7 stand-in", biomes: { mountain: 3, grassland_temperate: 2 } },
        { id: "deer", name: "Deer", image: "$U7_Deer", herd: [3, 7], wander: 14, note: "<creature> <grazer> <large>", requestId: "AR-401", status: "U7 stand-in", biomes: { forest_temperate_broadleaf: 4, forest_temperate_conifer: 3 } },
        { id: "horse", name: "Wild horse", image: "$U7_Horse", herd: [2, 5], wander: 16, note: "<creature> <grazer> <draft>", requestId: "AR-403", status: "U7 stand-in", biomes: { grassland_temperate: 3, savanna_temperate: 2 } },
        { id: "sheep", name: "Wild sheep", image: "$U7_Sheep", herd: [3, 8], wander: 10, note: "<creature> <grazer> <wool>", requestId: "AR-403", status: "U7 stand-in", biomes: { mountain: 4, grassland_temperate: 2 } },
        { id: "rat", name: "Rat", image: "$U7_Rat", herd: [2, 6], wander: 6, note: "<creature> <pest>", requestId: "AR-401", status: "U7 stand-in", biomes: { swamp_temperate_fresh: 2, marsh_temperate_fresh: 2 } },
        { id: "bog_horror", name: "Bog horror", image: "$U7_BogHorror", herd: [1, 1], wander: 8, note: "<creature> <monster>", requestId: "AR-402", status: "U7 stand-in", minSavagery: "primeval", biomes: { swamp_temperate_fresh: 1, swamp_tropical_fresh: 1, marsh_temperate_salt: 0.5 } },
        { id: "serpent", name: "Giant serpent", image: "$U7_Serpent", herd: [1, 2], wander: 10, note: "<creature> <predator>", requestId: "AR-401", status: "U7 stand-in", biomes: { swamp_temperate_fresh: 2, swamp_tropical_fresh: 2 } }
    ],
    savageryScale: { tame: 0.6, wild: 1, primeval: 1.8 },
    startSafeRadius: 24
};

// 11. Update factions species (all home: surface, with U7 assets)
for (const s of cat.factions.species) {
    s.home = "surface";
    if (s.id === "human") { s.image = "$U7_Townsman"; s.requestId = "AR-050"; s.status = "U7 stand-in"; }
    else if (s.id === "elf") { s.image = "$U7_Ranger"; s.requestId = "AR-400"; s.status = "U7 stand-in"; }
    else if (s.id === "dwarf") { s.image = "$U7_DwarfGuard"; s.requestId = "AR-400"; s.status = "U7 stand-in"; }
    else if (s.id === "goblin") { s.image = "$U7_Goblin"; s.requestId = "AR-400"; s.status = "U7 stand-in"; }
    else if (s.id === "orc") { s.image = "$U7_Orc"; s.requestId = "AR-400"; s.status = "U7 stand-in"; }
    else if (s.id === "gnome") { s.image = "$U7_Gnome"; s.requestId = "AR-400"; s.status = "U7 stand-in"; }
    else if (s.id === "automaton") { s.image = "$U7_Automaton"; s.requestId = "AR-400"; s.status = "U7 stand-in"; }
}

// 12. Add UI section
cat.ui = {
    lookCursor: { name: "Look cursor", image: "U7_Cursor.png", requestId: "AR-030", status: "U7 stand-in" },
    selectionMarker: { name: "Unit selection marker", image: "U7_Select.png", requestId: "AR-031", status: "U7 stand-in" },
    windowSkin: { name: "UI Window skin", image: "Window.png", requestId: "AR-033", status: "U7 stand-in" }
};

// 13. Subterranean level retired
delete cat.underground;

fs.writeFileSync(catalogPath, JSON.stringify(cat, null, 2), "utf8");
console.log("Successfully updated UF_WorldCatalog.json to version 3!");
