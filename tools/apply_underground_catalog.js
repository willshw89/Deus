const fs = require('fs');
const path = require('path');

const catPath = path.join(__dirname, '..', 'game', 'data', 'UF_WorldCatalog.json');
const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));

// 1. Subterranean flora objects
const subFlora = [
  {
    id: "glow_caps",
    name: "Glow-caps",
    tile: { sheet: "Outside_B", id: 163 },
    tint: "#60f0c0",
    under: true,
    passable: true,
    tags: ["plant", "food", "underground", "fungus"],
    actions: {
      gather: { work: 30, yields: { mushroom: 2 }, becomes: null }
    },
    clump: 0.7,
    clumpScale: 8,
    avoidWater: 0
  },
  {
    id: "cave_mushrooms",
    name: "Cave mushrooms",
    tile: { sheet: "Outside_B", id: 251 },
    tint: "#d090d0",
    under: true,
    passable: true,
    tags: ["plant", "food", "underground", "fungus"],
    actions: {
      gather: { work: 30, yields: { mushroom: 2 }, becomes: null }
    },
    clump: 0.7,
    clumpScale: 8,
    avoidWater: 0
  },
  {
    id: "tower_cap",
    name: "Tower-cap",
    tile: { sheet: "Outside_B", id: 176, w: 2, h: 2 },
    tint: "#a090b8",
    tags: ["tree", "wood", "underground", "fungus"],
    actions: {
      chop: { work: 220, yields: { log: 3 }, becomes: "stump" }
    },
    clump: 0.6,
    clumpScale: 14,
    avoidWater: 1
  },
  {
    id: "cave_moss",
    name: "Cave moss",
    tile: { sheet: "Outside_B", id: 251 },
    tint: "#50a060",
    under: true,
    passable: true,
    tags: ["plant", "fiber", "underground"],
    actions: {
      gather: { work: 20, yields: { fiber: 2 }, becomes: null }
    },
    clump: 0.8,
    clumpScale: 10,
    avoidWater: 0
  },
  {
    id: "spore_reeds",
    name: "Spore reeds",
    tile: { sheet: "Outside_B", id: 251 },
    tint: "#90c0b0",
    under: true,
    passable: true,
    tags: ["plant", "fiber", "straw", "underground"],
    actions: {
      gather: { work: 25, yields: { straw: 2 }, becomes: null }
    },
    clump: 0.7,
    clumpScale: 8,
    avoidWater: 0
  },
  {
    id: "stalagmite",
    name: "Stalagmite",
    tile: { sheet: "Outside_B", id: 159 },
    tint: "#7a7a8a",
    tags: ["stone", "boulder", "underground"],
    actions: {
      quarry: { work: 180, yields: { stone: 3 }, becomes: "rocks_small" },
      mine: { work: 180, yields: { stone: 3 }, becomes: "rocks_small" }
    },
    clump: 0.7,
    clumpScale: 12,
    avoidWater: 0
  },
  {
    id: "crystal_spire",
    name: "Crystal spire",
    tile: { sheet: "Outside_C", id: 287 },
    tint: "#80d0ff",
    tags: ["gem", "mineral", "underground"],
    actions: {
      mine: { work: 220, yields: { gem_rough: 2 }, becomes: "crystal_small" }
    },
    clump: 0.8,
    clumpScale: 10,
    avoidWater: 1
  }
];

// Append or replace in cat.objects
for (const item of subFlora) {
  const idx = cat.objects.findIndex(o => o.id === item.id);
  if (idx >= 0) cat.objects[idx] = item;
  else cat.objects.push(item);
}

// Add 'underground' tag to underground stone/ore objects so kit validation passes
const tagUnderground = ["rocks_small", "granite_boulder", "ironstone", "copper_outcrop", "crystal", "crystal_small"];
for (const id of tagUnderground) {
  const o = cat.objects.find(obj => obj.id === id);
  if (o && o.tags && !o.tags.includes("underground")) {
    o.tags.push("underground");
  }
}

// 2. Add mine & dismantle actions to wall_wood, wall_stone, door_wood, door_stone
const wallWood = cat.objects.find(o => o.id === "wall_wood");
if (wallWood) {
  wallWood.actions = wallWood.actions || {};
  wallWood.actions.chop = wallWood.actions.chop || { work: 120, yields: { log: 1 }, becomes: null };
  wallWood.actions.mine = { work: 120, yields: { log: 1 }, becomes: null };
  wallWood.actions.dismantle = { work: 90, yields: { log: 1 }, becomes: null };
}

const wallStone = cat.objects.find(o => o.id === "wall_stone");
if (wallStone) {
  wallStone.actions = wallStone.actions || {};
  wallStone.actions.quarry = wallStone.actions.quarry || { work: 180, yields: { stone: 2 }, becomes: "rubble" };
  wallStone.actions.mine = { work: 180, yields: { stone: 2 }, becomes: "rubble" };
  wallStone.actions.dismantle = { work: 150, yields: { stone: 2 }, becomes: null };
}

const doorWood = cat.objects.find(o => o.id === "door_wood");
if (doorWood) {
  doorWood.actions = doorWood.actions || {};
  doorWood.actions.dismantle = { work: 60, yields: { log: 1 }, becomes: null };
  doorWood.actions.mine = { work: 90, yields: { log: 1 }, becomes: null };
  doorWood.actions.chop = { work: 90, yields: { log: 1 }, becomes: null };
}

const doorStone = cat.objects.find(o => o.id === "door_stone");
if (doorStone) {
  doorStone.actions = doorStone.actions || {};
  doorStone.actions.dismantle = { work: 90, yields: { stone: 1 }, becomes: null };
  doorStone.actions.mine = { work: 120, yields: { stone: 1 }, becomes: null };
  doorStone.actions.quarry = { work: 120, yields: { stone: 1 }, becomes: null };
}

// 3. Add cat.start.undergroundKit
cat.start = cat.start || {};
cat.start.undergroundKit = {
  "-1": {
    objects: {
      cave_mushrooms: 8,
      tower_cap: 8,
      rocks_small: 10,
      cave_moss: 40,
      spore_reeds: 6,
      stalagmite: 4,
      glow_caps: 4
    },
    natural: [
      { id: "cave_mushrooms", chance: 0.04, biomes: ["rooted_loam", "clay_bed", "shallow_cave"] },
      { id: "glow_caps", chance: 0.03, biomes: ["shallow_cave", "chalk_karst"] },
      { id: "tower_cap", chance: 0.02, biomes: ["shallow_cave", "rooted_loam"] },
      { id: "cave_moss", chance: 0.06 },
      { id: "spore_reeds", chance: 0.05, nearWater: 3 },
      { id: "stalagmite", chance: 0.025, biomes: ["chalk_karst", "shallow_cave"] }
    ]
  },
  "-2": {
    objects: {
      glow_caps: 8,
      tower_cap: 6,
      rocks_small: 10,
      cave_moss: 30,
      spore_reeds: 4,
      stalagmite: 6,
      crystal_spire: 3
    },
    natural: [
      { id: "glow_caps", chance: 0.05, biomes: ["deep_mine_belt", "crystal_cavern"] },
      { id: "cave_mushrooms", chance: 0.03, biomes: ["fossil_bed", "deep_salt_cavern"] },
      { id: "tower_cap", chance: 0.025, biomes: ["crystal_cavern", "deep_mine_belt"] },
      { id: "cave_moss", chance: 0.05 },
      { id: "spore_reeds", chance: 0.04, nearWater: 3 },
      { id: "stalagmite", chance: 0.035, biomes: ["deep_mine_belt", "deep_salt_cavern", "fossil_bed"] },
      { id: "crystal_spire", chance: 0.02, biomes: ["crystal_cavern"] }
    ]
  }
};

// 4. Add 8 underground biomes into cat.biomes
cat.biomes = cat.biomes || {};
const undergroundBiomes = {
  rooted_loam: {
    name: "Rooted loam",
    ground: "mined_soil",
    water: "fresh",
    plants: { cave_moss: 0.06, cave_mushrooms: 0.04, tower_cap: 0.02, rocks_small: 0.02 }
  },
  clay_bed: {
    name: "Clay bed",
    ground: "mined_soil",
    water: "fresh",
    plants: { cave_moss: 0.05, cave_mushrooms: 0.04, spore_reeds: 0.03, rocks_small: 0.03 }
  },
  chalk_karst: {
    name: "Chalk and karst",
    ground: "mined_stone",
    water: "fresh",
    plants: { stalagmite: 0.04, glow_caps: 0.03, cave_moss: 0.04, rocks_small: 0.03 }
  },
  shallow_cave: {
    name: "Shallow cave",
    ground: "cave_floor",
    water: "fresh",
    plants: { cave_mushrooms: 0.04, glow_caps: 0.03, tower_cap: 0.025, spore_reeds: 0.04, stalagmite: 0.03, rocks_small: 0.03 }
  },
  deep_mine_belt: {
    name: "Deep mine belt",
    ground: "mined_stone",
    water: "fresh",
    plants: { stalagmite: 0.05, glow_caps: 0.04, tower_cap: 0.02, ironstone: 0.02, copper_outcrop: 0.015, rocks_small: 0.04 }
  },
  crystal_cavern: {
    name: "Crystal cavern",
    ground: "cave_floor",
    water: "fresh",
    plants: { crystal_spire: 0.03, glow_caps: 0.05, tower_cap: 0.025, crystal_small: 0.03, rocks_small: 0.02 }
  },
  fossil_bed: {
    name: "Fossil bed",
    ground: "mined_soil",
    water: "fresh",
    plants: { stalagmite: 0.04, cave_mushrooms: 0.03, cave_moss: 0.04, rocks_small: 0.03 }
  },
  deep_salt_cavern: {
    name: "Deep salt cavern",
    ground: "cave_floor",
    water: "salt",
    plants: { stalagmite: 0.04, cave_mushrooms: 0.03, spore_reeds: 0.03, rocks_small: 0.03 }
  }
};
Object.assign(cat.biomes, undergroundBiomes);

// 5. Update cat.wildlife.species with underground biomes
if (cat.wildlife && Array.isArray(cat.wildlife.species)) {
  const caveSpeciesAffinities = {
    giant_spider: { shallow_cave: 0.35, crystal_cavern: 0.35, deep_mine_belt: 0.30, deep_salt_cavern: 0.25 },
    bat: { shallow_cave: 0.40, rooted_loam: 0.30, chalk_karst: 0.35, deep_mine_belt: 0.25 },
    rat: { shallow_cave: 0.35, clay_bed: 0.35, rooted_loam: 0.30 },
    troll: { deep_mine_belt: 0.35, chalk_karst: 0.30, fossil_bed: 0.30 },
    bog_horror: { deep_salt_cavern: 0.30, fossil_bed: 0.25 }
  };
  for (const sp of cat.wildlife.species) {
    if (caveSpeciesAffinities[sp.id]) {
      sp.biomes = sp.biomes || {};
      Object.assign(sp.biomes, caveSpeciesAffinities[sp.id]);
    }
  }
}

fs.writeFileSync(catPath, JSON.stringify(cat, null, 2) + '\n', 'utf8');
console.log('Successfully updated UF_WorldCatalog.json with underground flora, kits, biomes, fauna affinities, and mineable walls.');

