// tools/add_combat_chains.js
// Adds the combat production chains (VISION V55; spec docs/design/COMBAT_CHAINS.md) to game/data/UF_WorldCatalog.json:
//   materials (new top level), labors (new top level), combat (new top level, merged if another agent added one),
//   items.types (weapons, armor, shields, ammunition, intermediates; weapon/armor blocks on the stone tools and
//   the hide cloak when missing), recipes.list, objects (six workshops; the work stone gains the "workbench" tag),
//   wildlife.species yields (feathers on fowl, songbird, hawk), cultures.<species>.chainWeights / .arms,
//   colony.skills, colony.plan and colony.plans.* (the arming steps).
// It re-reads the catalog immediately before writing it back whole, touches only those keys, keeps every other
// entry byte for byte (a style oracle records how the file was formatted, and untouched sections are asserted
// identical before anything is written) and is idempotent: entries it owns are replaced by id, never duplicated.
// Run:  "C:\Program Files\nodejs\node.exe" tools\add_combat_chains.js [--dry-run] [--out <file>]
//       --dry-run  formats and verifies without writing (prints what would change)
//       --out      also writes the formatted result to <file> (for a diff against the original)
// Exit 1 when a verification fails; nothing is written then.
"use strict";
const fs = require("fs");
const path = require("path");

const CATALOG = path.join(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
const DRY = process.argv.includes("--dry-run");
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;

//---------------------------------------------------------------------------------------------------------------
// The data (docs/design/COMBAT_CHAINS.md is the spec; every number here is explained there)

const MATERIALS_ABOUT = "Materials of made things (docs/design/COMBAT_CHAINS.md section 1). kind = the family; density in kg per litre; hardness 0-10; value = worth per unit for trade later; damage / armor = multipliers UF_Combat applies to a weapon's rolled dice (melee: the weapon's material; ranged: the ammunition's) and to an armor piece's ac bonus, rounded half up, minimum 1 damage on a hit. Bronze has no recipe until a tin ore exists; the row fixes its numbers. Written 2026-09-18 (Claude Code).";
const MATERIALS = [
    { id: "wood", name: "Wood", kind: "wood", density: 0.6, hardness: 2, value: 1, damage: 0.7, armor: 0.8 },
    { id: "stone", name: "Stone", kind: "stone", density: 2.7, hardness: 5, value: 1, damage: 0.8, armor: 0.9 },
    { id: "bone", name: "Bone", kind: "bone", density: 1.8, hardness: 3, value: 1, damage: 0.75, armor: 0.8 },
    { id: "leather", name: "Leather", kind: "leather", density: 0.9, hardness: 1, value: 2, damage: 0.5, armor: 1 },
    { id: "copper", name: "Copper", kind: "copper", density: 8.9, hardness: 4, value: 3, damage: 0.9, armor: 0.9 },
    { id: "bronze", name: "Bronze", kind: "bronze", density: 8.3, hardness: 6, value: 5, damage: 1, armor: 1 },
    { id: "iron", name: "Iron", kind: "iron", density: 7.9, hardness: 7, value: 6, damage: 1.1, armor: 1.1 }
];

const LABORS_ABOUT = "Labors that run the combat chains (VISION V43 and V55; docs/design/COMBAT_CHAINS.md section 6). jobs = the job types the labor covers; skill = the colony.skills entry it trains and that its quality rolls use; priority = the cultures.<species>.priorities key it inherits, multiplied by cultures.<species>.chainWeights[labor]. The full labor set (mining, woodcutting, ...) arrives with the labors build; these are the ones the chain recipes and the arming step name. Written 2026-09-18 (Claude Code).";
const LABORS = [
    { id: "furnace_operator", name: "Furnace operator", jobs: ["craft"], skill: "smelting", priority: "craft" },
    { id: "weaponsmith", name: "Weaponsmith", jobs: ["craft"], skill: "smithing", priority: "craft" },
    { id: "armorsmith", name: "Armorsmith", jobs: ["craft"], skill: "smithing", priority: "craft" },
    { id: "bowyer", name: "Bowyer", jobs: ["craft"], skill: "bowyery", priority: "craft" },
    { id: "fletcher", name: "Fletcher", jobs: ["craft"], skill: "fletching", priority: "craft" },
    { id: "tanner", name: "Tanner", jobs: ["craft"], skill: "tanning", priority: "craft" },
    { id: "leatherworker", name: "Leatherworker", jobs: ["craft"], skill: "leatherwork", priority: "craft" },
    { id: "carpenter", name: "Carpenter", jobs: ["craft"], skill: "carpentry", priority: "craft" },
    { id: "soldier", name: "Soldier", jobs: ["attack", "guard"], skill: "fighting", priority: "hunt" }
];

const COMBAT_ABOUT = "d20 rules (VISION V47; SRD 5.1, CC-BY-4.0, credited in docs/CREDITS.md; docs/design/COMBAT_CHAINS.md section 5). AC = baseAC + min(dex modifier, the torso piece's dexMax) + the ac of the head, torso and legs pieces + the shield's ac + quality modifiers. To hit: d20 + ability modifier + proficiency (base + floor(skill / perSkill)) against AC; a natural critical.hit hits and doubles the dice, a natural critical.miss misses. Damage: the weapon's dice x its material's damage multiplier + the ability modifier (unarmed: flat + str). Ranges are in cells: SRD feet / 10 (1 cell = 5 ft, halved for the map's readability). quality: roll d20 + floor(skill / 2) + ability modifier at craft; the quality is the number of thresholds the roll exceeds; toHit / ac / value are indexed by quality 0-5. Written 2026-09-18 (Claude Code); the combat core plugin may add keys.";
const COMBAT = {
    about: COMBAT_ABOUT,
    baseAC: 10,
    unarmed: { flat: 1, ability: "str", reach: 1 },
    proficiency: { base: 2, perSkill: 5 },
    critical: { hit: 20, miss: 1 },
    abilities: ["str", "dex", "con", "int", "wis", "cha"],
    slots: ["head", "weapon", "shield", "torso", "legs"],
    aliases: { tool: "weapon", clothes: "torso" },
    ranged: { shotsPerBeat: 1, missScatter: 1, longRangeDisadvantage: true, losBlockedBy: "objects that are neither passable nor under" },
    quality: { thresholds: [5, 10, 15, 20, 25], names: ["crude", "rough", "plain", "sound", "fine", "flawless"], toHit: [-1, 0, 0, 0, 1, 1], ac: [-1, 0, 0, 0, 1, 1], value: [0.5, 0.8, 1, 1.2, 1.5, 2] }
};

// Weapon/armor blocks for the four existing entries the combat core also owns (added only when missing).
const EXISTING_BLOCKS = {
    stone_axe: { material: "stone", weight: 1.4, weapon: { damage: "1d6", ability: "str", hands: 1, reach: 1, skill: "fighting", properties: [] } },
    stone_knife: { material: "stone", weight: 0.3, weapon: { damage: "1d4", ability: "finesse", hands: 1, reach: 1, skill: "fighting", properties: ["finesse", "light"] } },
    stone_pick: { material: "stone", weight: 1.8, weapon: { damage: "1d6", ability: "str", hands: 1, reach: 1, skill: "fighting", properties: [] } },
    fiber_wrap: { weight: 0.5, armor: { slot: "torso", ac: 0, dexMax: null, soak: 0 } },
    hide_cloak: { material: "leather", weight: 5.4, armor: { slot: "torso", ac: 2, dexMax: 2, soak: 1 } }
};

const ITEMS = [
    { id: "charcoal", name: "Charcoal", image: "!$U7_Item_Firewood", tint: "#585858", tags: ["fuel", "material", "charcoal"], stack: 10, weight: 0.5, labor: "furnace_operator" },
    { id: "bar_copper", name: "Copper bar", image: "!$U7_Item_MetalBar", tint: "#e0a070", tags: ["metal", "material"], stack: 10, material: "copper", weight: 2, labor: "furnace_operator" },
    { id: "feathers", name: "Feathers", image: "!$U7_Item_PlantFiber", tint: "#f4f4f8", tags: ["feathers", "material"], stack: 20, weight: 0.1 },
    { id: "leather", name: "Leather", image: "!$U7_Item_LeatherHide", tint: "#a06838", tags: ["leather", "material"], stack: 5, material: "leather", weight: 1, labor: "tanner" },
    { id: "arrows", name: "Arrows", image: "!$U7_Item_AnimalBone", tint: "#d8c8a0", tags: ["ammo", "arrow"], stack: 24, material: "stone", weight: 0.05, labor: "fletcher", quality: true, ammo: { for: ["bow_short", "bow_long"] } },
    { id: "bow_short", name: "Short bow", image: "!$U7_Item_WoodLog", tint: "#d0a868", tags: ["weapon", "ranged", "bow"], stack: 1, material: "wood", weight: 0.9, labor: "bowyer", quality: true, weapon: { damage: "1d6", ability: "dex", hands: 2, reach: 1, skill: "archery", properties: ["ammunition", "two-handed"], ranged: { range: 8, long: 32, ammo: "arrows" } } },
    { id: "bow_long", name: "Long bow", image: "!$U7_Item_WoodLog", tint: "#b08848", tags: ["weapon", "ranged", "bow"], stack: 1, material: "wood", weight: 0.9, labor: "bowyer", quality: true, weapon: { damage: "1d8", ability: "dex", hands: 2, reach: 1, skill: "archery", properties: ["ammunition", "heavy", "two-handed"], ranged: { range: 15, long: 60, ammo: "arrows" } } },
    { id: "sling", name: "Sling", image: "!$U7_Item_LeatherHide", tint: "#806048", tags: ["weapon", "ranged", "sling"], stack: 1, material: "leather", weight: 0.1, labor: "leatherworker", quality: true, weapon: { damage: "1d4", ability: "dex", hands: 1, reach: 1, skill: "archery", properties: ["ammunition"], ranged: { range: 6, long: 24, ammo: "stone" } } },
    { id: "club", name: "Club", image: "!$U7_Item_WoodLog", tint: "#a88858", tags: ["weapon", "melee", "blunt"], stack: 1, material: "wood", weight: 0.9, labor: "carpenter", quality: true, weapon: { damage: "1d4", ability: "str", hands: 1, reach: 1, skill: "fighting", properties: ["light"] } },
    { id: "spear", name: "Spear", image: "!$U7_Item_WoodLog", tint: "#e0d0b0", tags: ["weapon", "melee", "pierce"], stack: 1, material: "stone", weight: 1.4, labor: "carpenter", quality: true, weapon: { damage: "1d6", ability: "str", hands: 1, reach: 1, skill: "fighting", properties: ["thrown", "versatile"], versatile: "1d8", ranged: { range: 2, long: 6, ammo: null, thrown: true } } },
    { id: "dagger_iron", name: "Iron dagger", image: "!$U7_Item_MetalBar", tint: "#dce0e4", tags: ["weapon", "melee", "blade", "knife", "tool"], stack: 1, material: "iron", weight: 0.5, labor: "weaponsmith", quality: true, weapon: { damage: "1d4", ability: "finesse", hands: 1, reach: 1, skill: "fighting", properties: ["finesse", "light", "thrown"], ranged: { range: 2, long: 6, ammo: null, thrown: true } }, tool: { hunt: 2.5, gather: 1.5, craft: 1.5 } },
    { id: "sword_short", name: "Short sword", image: "!$U7_Item_MetalBar", tint: "#c8ccd0", tags: ["weapon", "melee", "blade"], stack: 1, material: "iron", weight: 0.9, labor: "weaponsmith", quality: true, weapon: { damage: "1d6", ability: "finesse", hands: 1, reach: 1, skill: "fighting", properties: ["finesse", "light"] } },
    { id: "sword_long", name: "Long sword", image: "!$U7_Item_MetalBar", tint: "#b4b8bc", tags: ["weapon", "melee", "blade"], stack: 1, material: "iron", weight: 1.4, labor: "weaponsmith", quality: true, weapon: { damage: "1d8", ability: "str", hands: 1, reach: 1, skill: "fighting", properties: ["versatile"], versatile: "1d10" } },
    { id: "axe_iron", name: "Iron axe", image: "!$U7_Item_MetalBar", tint: "#a4acb4", tags: ["weapon", "melee", "axe", "tool"], stack: 1, material: "iron", weight: 1.8, labor: "weaponsmith", quality: true, weapon: { damage: "1d8", ability: "str", hands: 2, reach: 1, skill: "fighting", properties: ["two-handed"] }, tool: { chop: 3 } },
    { id: "mace", name: "Copper mace", image: "!$U7_Item_MetalBar", tint: "#d4a070", tags: ["weapon", "melee", "blunt"], stack: 1, material: "copper", weight: 1.8, labor: "weaponsmith", quality: true, weapon: { damage: "1d6", ability: "str", hands: 1, reach: 1, skill: "fighting", properties: [] } },
    { id: "helmet_leather", name: "Leather cap", image: "!$U7_Item_LeatherHide", tint: "#b89060", tags: ["armor", "head", "leather"], stack: 1, material: "leather", weight: 0.5, labor: "leatherworker", quality: true, armor: { slot: "head", ac: 1, dexMax: null, soak: 1 } },
    { id: "helmet_iron", name: "Iron helmet", image: "!$U7_Item_MetalBar", tint: "#9098a4", tags: ["armor", "head", "metal"], stack: 1, material: "iron", weight: 1.4, labor: "armorsmith", quality: true, armor: { slot: "head", ac: 1, dexMax: null, soak: 2 } },
    { id: "armor_leather", name: "Leather armor", image: "!$U7_Item_LeatherHide", tint: "#8c5c30", tags: ["armor", "torso", "leather", "clothing"], stack: 1, material: "leather", weight: 4.5, labor: "leatherworker", quality: true, armor: { slot: "torso", ac: 1, dexMax: null, soak: 1 }, wear: { tier: 3 } },
    { id: "mail_iron", name: "Iron mail", image: "!$U7_Item_MetalBar", tint: "#8890a0", tags: ["armor", "torso", "metal", "clothing"], stack: 1, material: "iron", weight: 25, labor: "armorsmith", quality: true, armor: { slot: "torso", ac: 6, dexMax: 0, soak: 2, minStr: 13 }, wear: { tier: 3 } },
    { id: "leggings_leather", name: "Leather leggings", image: "!$U7_Item_LeatherHide", tint: "#a07848", tags: ["armor", "legs", "leather"], stack: 1, material: "leather", weight: 0.9, labor: "leatherworker", quality: true, armor: { slot: "legs", ac: 1, dexMax: null, soak: 1 } },
    { id: "greaves_iron", name: "Iron greaves", image: "!$U7_Item_MetalBar", tint: "#a0a8b8", tags: ["armor", "legs", "metal"], stack: 1, material: "iron", weight: 2.7, labor: "armorsmith", quality: true, armor: { slot: "legs", ac: 1, dexMax: null, soak: 2 } },
    { id: "shield_wood", name: "Wooden shield", image: "!$U7_Item_WoodLog", tint: "#b89478", tags: ["shield", "wood"], stack: 1, material: "wood", weight: 2.7, labor: "carpenter", quality: true, shield: { ac: 2 } },
    { id: "shield_iron", name: "Iron shield", image: "!$U7_Item_MetalBar", tint: "#b4bcc4", tags: ["shield", "metal"], stack: 1, material: "iron", weight: 5, labor: "armorsmith", quality: true, shield: { ac: 2 } }
];

const RECIPES_NOTE = " Combat-chain recipes (2026-09-18 night, docs/design/COMBAT_CHAINS.md) carry at (workshop tag), labor, skill, ability (the quality roll's ability), material (of the output) and quality (rolled at craft); their work is in beats (6-12, WORLD_ARCHITECTURE section 1.7) while the older recipes above them are still in ticks until the beat integration rescales them.";
const RECIPES = [
    { id: "charcoal", name: "Burn charcoal", inputs: { firewood: 3 }, outputs: { charcoal: 2 }, work: 8, at: "furnace", labor: "furnace_operator", skill: "smelting", ability: "con", quality: false },
    { id: "bar_iron", name: "Smelt an iron bar", inputs: { ore_iron: 2, charcoal: 1 }, outputs: { bar_iron: 1 }, work: 10, at: "furnace", labor: "furnace_operator", skill: "smelting", ability: "con", material: "iron", quality: false },
    { id: "bar_copper", name: "Smelt a copper bar", inputs: { ore_copper: 2, charcoal: 1 }, outputs: { bar_copper: 1 }, work: 8, at: "furnace", labor: "furnace_operator", skill: "smelting", ability: "con", material: "copper", quality: false },
    { id: "leather", name: "Tan a hide", inputs: { hide: 1 }, outputs: { leather: 1 }, work: 6, at: "tannery", labor: "tanner", skill: "tanning", ability: "con", material: "leather", quality: false, tool: "knife" },
    { id: "bow_short", name: "Carve a short bow", inputs: { log: 1, fiber: 2 }, outputs: { bow_short: 1 }, work: 10, at: "bowyer", labor: "bowyer", skill: "bowyery", ability: "dex", material: "wood", quality: true, tool: "knife" },
    { id: "bow_long", name: "Carve a long bow", inputs: { log: 2, fiber: 2 }, outputs: { bow_long: 1 }, work: 12, at: "bowyer", labor: "bowyer", skill: "bowyery", ability: "dex", material: "wood", quality: true, tool: "knife" },
    { id: "arrows_stone", name: "Fletch stone-tipped arrows", inputs: { log: 1, feathers: 3, stone: 1 }, outputs: { arrows: 12 }, work: 8, at: "fletcher", labor: "fletcher", skill: "fletching", ability: "dex", material: "stone", quality: true, tool: "knife" },
    { id: "arrows_bone", name: "Fletch bone-tipped arrows", inputs: { log: 1, feathers: 3, bone: 1 }, outputs: { arrows: 12 }, work: 8, at: "fletcher", labor: "fletcher", skill: "fletching", ability: "dex", material: "bone", quality: true, tool: "knife" },
    { id: "arrows_iron", name: "Fletch iron-tipped arrows", inputs: { log: 1, feathers: 3, bar_iron: 1 }, outputs: { arrows: 12 }, work: 10, at: "fletcher", labor: "fletcher", skill: "fletching", ability: "dex", material: "iron", quality: true, tool: "knife" },
    { id: "sling", name: "Braid a sling", inputs: { fiber: 3, leather: 1 }, outputs: { sling: 1 }, work: 6, at: "workbench", labor: "leatherworker", skill: "leatherwork", ability: "dex", material: "leather", quality: true },
    { id: "club", name: "Shape a club", inputs: { log: 1 }, outputs: { club: 1 }, work: 6, at: "workbench", labor: "carpenter", skill: "carpentry", ability: "str", material: "wood", quality: true, tool: "axe" },
    { id: "spear_stone", name: "Haft a stone spear", inputs: { log: 1, stone: 1, fiber: 1 }, outputs: { spear: 1 }, work: 8, at: "workbench", labor: "carpenter", skill: "carpentry", ability: "dex", material: "stone", quality: true, tool: "knife" },
    { id: "spear_iron", name: "Haft an iron spear", inputs: { log: 1, bar_iron: 1, fiber: 1 }, outputs: { spear: 1 }, work: 8, at: "smithy", labor: "weaponsmith", skill: "smithing", ability: "str", material: "iron", quality: true },
    { id: "shield_wood", name: "Build a wooden shield", inputs: { log: 2, leather: 1 }, outputs: { shield_wood: 1 }, work: 8, at: "workbench", labor: "carpenter", skill: "carpentry", ability: "dex", material: "wood", quality: true, tool: "axe" },
    { id: "dagger_iron", name: "Forge an iron dagger", inputs: { bar_iron: 1, leather: 1 }, outputs: { dagger_iron: 1 }, work: 8, at: "smithy", labor: "weaponsmith", skill: "smithing", ability: "str", material: "iron", quality: true },
    { id: "sword_short", name: "Forge a short sword", inputs: { bar_iron: 2, leather: 1 }, outputs: { sword_short: 1 }, work: 10, at: "smithy", labor: "weaponsmith", skill: "smithing", ability: "str", material: "iron", quality: true },
    { id: "sword_long", name: "Forge a long sword", inputs: { bar_iron: 3, leather: 1 }, outputs: { sword_long: 1 }, work: 12, at: "smithy", labor: "weaponsmith", skill: "smithing", ability: "str", material: "iron", quality: true },
    { id: "axe_iron", name: "Forge an iron axe", inputs: { bar_iron: 2, log: 1 }, outputs: { axe_iron: 1 }, work: 10, at: "smithy", labor: "weaponsmith", skill: "smithing", ability: "str", material: "iron", quality: true },
    { id: "mace", name: "Cast a copper mace", inputs: { bar_copper: 2, log: 1 }, outputs: { mace: 1 }, work: 8, at: "smithy", labor: "weaponsmith", skill: "smithing", ability: "str", material: "copper", quality: true },
    { id: "helmet_leather", name: "Stitch a leather cap", inputs: { leather: 2 }, outputs: { helmet_leather: 1 }, work: 6, at: "workbench", labor: "leatherworker", skill: "leatherwork", ability: "dex", material: "leather", quality: true, tool: "knife" },
    { id: "armor_leather", name: "Stitch leather armor", inputs: { leather: 4, fiber: 2 }, outputs: { armor_leather: 1 }, work: 10, at: "workbench", labor: "leatherworker", skill: "leatherwork", ability: "dex", material: "leather", quality: true, tool: "knife" },
    { id: "leggings_leather", name: "Stitch leather leggings", inputs: { leather: 2, fiber: 1 }, outputs: { leggings_leather: 1 }, work: 6, at: "workbench", labor: "leatherworker", skill: "leatherwork", ability: "dex", material: "leather", quality: true, tool: "knife" },
    { id: "helmet_iron", name: "Forge an iron helmet", inputs: { bar_iron: 2, leather: 1 }, outputs: { helmet_iron: 1 }, work: 10, at: "smithy", labor: "armorsmith", skill: "smithing", ability: "str", material: "iron", quality: true },
    { id: "mail_iron", name: "Forge iron mail", inputs: { bar_iron: 5, leather: 1 }, outputs: { mail_iron: 1 }, work: 12, at: "smithy", labor: "armorsmith", skill: "smithing", ability: "str", material: "iron", quality: true },
    { id: "greaves_iron", name: "Forge iron greaves", inputs: { bar_iron: 2, leather: 1 }, outputs: { greaves_iron: 1 }, work: 10, at: "smithy", labor: "armorsmith", skill: "smithing", ability: "str", material: "iron", quality: true },
    { id: "shield_iron", name: "Forge an iron shield", inputs: { bar_iron: 2, log: 1 }, outputs: { shield_iron: 1 }, work: 10, at: "smithy", labor: "armorsmith", skill: "smithing", ability: "str", material: "iron", quality: true }
];

// Workshops: one cell each (VISION V44), impassable, stock RMMZ tiles until AR-510 (tile ids follow UF_Objects'
// rect formula: C sheet id = 256 + local, right half local = 128 + row * 8 + (col - 8)).
const OBJECTS = [
    { id: "furnace", name: "Furnace", tile: { sheet: "Outside_B", id: 148 }, tint: "#e0b898", tags: ["building", "workplace", "furnace"], build: { items: { stone: 6 }, work: 8 }, ruin: "rubble" },
    { id: "smithy", name: "Smithy", tile: { sheet: "Inside_C", id: 404 }, tags: ["building", "workplace", "smithy"], build: { items: { stone: 4, log: 1, bar_iron: 1 }, work: 8 }, ruin: "rubble" },
    { id: "bowyer_bench", name: "Bowyer's bench", tile: { sheet: "Inside_C", id: 403 }, tags: ["building", "workplace", "bowyer"], build: { items: { log: 2 }, work: 6 }, ruin: "rubble" },
    { id: "fletcher_bench", name: "Fletcher's bench", tile: { sheet: "Inside_C", id: 403 }, tint: "#c8d8f0", tags: ["building", "workplace", "fletcher"], build: { items: { log: 2, stone: 1 }, work: 6 }, ruin: "rubble" },
    { id: "tanning_rack", name: "Tanning rack", tile: { sheet: "Outside_B", id: 149 }, tags: ["building", "workplace", "tannery"], build: { items: { log: 3, fiber: 2 }, work: 4 }, ruin: "rubble" },
    { id: "weapon_rack", name: "Weapon rack", tile: { sheet: "Inside_C", id: 400 }, tags: ["building", "stockpile", "weapon_rack"], build: { items: { log: 2 }, work: 4 }, ruin: "rubble" }
];

const FEATHERS = { fowl: 4, songbird: 2, hawk: 3 };

const CULTURES = {
    human: { chainWeights: {}, arms: { prefer: ["sword_short", "spear", "bow_short", "shield_wood"], scavenge: 0.2 } },
    elf: { chainWeights: { bowyer: 1.5, fletcher: 1.5, tanner: 1.2, leatherworker: 1.2, furnace_operator: 0.6, weaponsmith: 0.6, armorsmith: 0.6 }, arms: { prefer: ["bow_long", "spear", "dagger_iron"], scavenge: 0.1 } },
    dwarf: { chainWeights: { furnace_operator: 1.5, weaponsmith: 1.5, armorsmith: 1.5, bowyer: 0.6, fletcher: 0.6 }, arms: { prefer: ["axe_iron", "mace", "shield_iron", "helmet_iron", "mail_iron"], scavenge: 0.1 } },
    gnome: { chainWeights: { fletcher: 1.3, weaponsmith: 1.2, armorsmith: 1.2, carpenter: 1.2 }, arms: { prefer: ["sling", "bow_short", "dagger_iron"], scavenge: 0.3 } },
    goblin: { chainWeights: { furnace_operator: 0.5, weaponsmith: 0.5, armorsmith: 0.5, tanner: 1.2, leatherworker: 1.2 }, arms: { prefer: ["club", "spear", "sling", "dagger_iron"], scavenge: 1 } },
    orc: { chainWeights: { weaponsmith: 1.3, bowyer: 0.7, fletcher: 0.7 }, arms: { prefer: ["axe_iron", "sword_long", "mace", "club"], scavenge: 0.5 } },
    automaton: { chainWeights: { furnace_operator: 1.4, armorsmith: 1.4, weaponsmith: 1.2, tanner: 0.3, leatherworker: 0.3, bowyer: 0.5, fletcher: 0.5 }, arms: { prefer: ["mace", "sword_long", "shield_iron", "helmet_iron"], scavenge: 0 } }
};

const SKILLS = ["smelting", "smithing", "bowyery", "fletching", "tanning", "leatherwork", "carpentry", "fighting", "archery"];

// Plan steps (colony.plan and each plans variant): build steps use cells relative to the site centre that no
// existing step uses; craft steps use count (the colony holds that many); arm is the new step kind.
const STEP = {
    workstone: { id: "workstone", build: "workbench", cells: [[-3, 0]] },
    tannery: { id: "tannery", build: "tanning_rack", cells: [[-3, -1]] },
    leather: { id: "leather", craft: "leather", count: 4 },
    bowyer: { id: "bowyer", build: "bowyer_bench", cells: [[-3, 1]] },
    bows_short: { id: "bows", craft: "bow_short", count: 2 },
    bows_long: { id: "bows", craft: "bow_long", count: 2 },
    fletcher: { id: "fletcher", build: "fletcher_bench", cells: [[-3, 2]] },
    arrows: { id: "arrows", craft: "arrows_stone", count: 24 },
    firewood: { id: "firewood", craft: "split_firewood", count: 6 },
    furnace: { id: "furnace", build: "furnace", cells: [[3, -1]] },
    charcoal: { id: "charcoal", craft: "charcoal", count: 4 },
    bars: { id: "bars", craft: "bar_iron", count: 4 },
    smithy: { id: "smithy", build: "smithy", cells: [[3, 0]] },
    blades_sword: { id: "blades", craft: "sword_short", count: 2 },
    blades_axe: { id: "blades", craft: "axe_iron", count: 2 },
    blades_spear: { id: "blades", craft: "spear_stone", count: 2 },
    blades_dagger: { id: "blades", craft: "dagger_iron", count: 2 },
    armor_leather: { id: "armor", craft: "armor_leather", count: 2 },
    armor_mail: { id: "armor", craft: "mail_iron", count: 1 },
    rack: { id: "rack", build: "weapon_rack", cells: [[3, 1]], stores: ["weapon", "armor", "shield", "ammo"] },
    arm: { id: "arm", arm: ["weapon"], share: 0.5, first: ["soldier"] }
};
const PLAN_STEPS = {
    default: ["tannery", "leather", "bowyer", "bows_short", "fletcher", "arrows", "firewood", "furnace", "charcoal", "bars", "smithy", "blades_sword", "armor_leather", "rack", "arm"],
    forest: ["workstone", "tannery", "leather", "bowyer", "bows_long", "fletcher", "arrows", "blades_spear", "armor_leather", "rack", "arm"],
    stone: ["tannery", "leather", "firewood", "furnace", "charcoal", "bars", "smithy", "blades_axe", "armor_mail", "rack", "arm"],
    workshop: ["tannery", "leather", "bowyer", "bows_short", "fletcher", "arrows", "firewood", "furnace", "charcoal", "bars", "smithy", "blades_dagger", "armor_leather", "rack", "arm"]
};
const OWNED_STEP_IDS = new Set(Object.values(STEP).map(s => s.id));

//---------------------------------------------------------------------------------------------------------------
// A JSON parser that records how each node was written (inline or spread over lines, which children shared a
// line, the raw text of each primitive), so the file can be written back in its own style.

function parseWithStyle(text) {
    let i = 0, line = 1;
    const ws = () => { while (i < text.length) { const c = text[i]; if (c === "\n") { line++; i++; } else if (c === " " || c === "\t" || c === "\r") i++; else break; } };
    const fail = msg => { throw new Error(`catalog parse: ${msg} at line ${line}`); };
    function value() {
        ws();
        const c = text[i];
        if (c === "{") return object();
        if (c === "[") return array();
        const start = i, line0 = line;
        if (c === '"') {
            i++;
            while (i < text.length && text[i] !== '"') { if (text[i] === "\\") i++; i++; }
            i++;
        } else {
            while (i < text.length && !/[\s,\]}]/.test(text[i])) i++;
        }
        const raw = text.slice(start, i);
        return { kind: "prim", value: JSON.parse(raw), raw, line0, line1: line };
    }
    function object() {
        const line0 = line;
        i++; // {
        const kids = [];
        ws();
        if (text[i] === "}") { i++; return { kind: "obj", kids, line0, line1: line, value: {} }; }
        for (;;) {
            ws();
            const kl = line;
            if (text[i] !== '"') fail("expected a key");
            const ks = i; i++;
            while (text[i] !== '"') { if (text[i] === "\\") i++; i++; }
            i++;
            const key = JSON.parse(text.slice(ks, i));
            ws();
            if (text[i] !== ":") fail("expected :");
            i++;
            const node = value();
            node.keyLine = kl;
            kids.push({ key, node });
            ws();
            if (text[i] === ",") { i++; continue; }
            if (text[i] === "}") { i++; break; }
            fail("expected , or }");
        }
        const v = {};
        for (const k of kids) v[k.key] = k.node.value;
        return { kind: "obj", kids, line0, line1: line, value: v };
    }
    function array() {
        const line0 = line;
        i++; // [
        const kids = [];
        ws();
        if (text[i] === "]") { i++; return { kind: "arr", kids, line0, line1: line, value: [] }; }
        for (;;) {
            const node = value();
            node.keyLine = node.line0;
            kids.push({ node });
            ws();
            if (text[i] === ",") { i++; continue; }
            if (text[i] === "]") { i++; break; }
            fail("expected , or ]");
        }
        return { kind: "arr", kids, line0, line1: line, value: kids.map(k => k.node.value) };
    }
    const root = value();
    ws();
    if (i !== text.length) fail("trailing text");
    return root;
}

// Style of a node: { inline, groups: [bool per child: starts on the previous child's line], raw }.
function styleOf(node) {
    if (!node) return null;
    if (node.kind === "prim") return { raw: node.raw };
    const inline = node.line0 === node.line1;
    const groups = node.kids.map((k, n) => n > 0 && k.node.keyLine === node.kids[n - 1].node.line1);
    return { inline, groups, kids: node.kids };
}
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

// Serialize `value` using `node` (the original parse node at the same path, when any) as the style oracle.
// New containers copy the style of their nearest existing sibling, else `hint` ("inline" | "expanded").
// Explicit layout of the new top-level sections; every other new container is written inline like a record.
const HINTS = { materials: "expanded", "materials.list": "expanded", labors: "expanded", "labors.list": "expanded", combat: "expanded" };
function format(value, node, indent, hint, path) {
    path = path || "";
    if (HINTS[path]) hint = HINTS[path];
    const st = styleOf(node);
    if (!isObj(value) && !Array.isArray(value)) {
        if (st && st.raw !== undefined && JSON.stringify(JSON.parse(st.raw)) === JSON.stringify(value)) return st.raw;
        return JSON.stringify(value);
    }
    const keys = Array.isArray(value) ? value.map((_, n) => n) : Object.keys(value);
    if (keys.length === 0) return Array.isArray(value) ? "[]" : "{}";
    const kidNode = key => {
        if (!st || !st.kids) return null;
        if (Array.isArray(value)) {
            // arrays: match by id when the elements are records, else by index
            const el = value[key];
            if (isObj(el) && el.id !== undefined) { const m = st.kids.find(k => isObj(k.node.value) && k.node.value.id === el.id); return m ? m.node : null; }
            return st.kids[key] ? st.kids[key].node : null;
        }
        const m = st.kids.find(k => k.key === key);
        return m ? m.node : null;
    };
    const siblingHint = () => {
        if (!st || !st.kids || !st.kids.length) return "inline";
        const last = st.kids[st.kids.length - 1].node;
        return last.kind === "prim" ? "inline" : (last.line0 === last.line1 ? "inline" : "expanded");
    };
    const inline = st ? st.inline : hint !== "expanded";
    const childHint = inline ? "inline" : siblingHint();
    const pieces = keys.map(key => {
        const child = value[key];
        const text = format(child, kidNode(key), inline ? indent : indent + 2, childHint, path ? `${path}.${key}` : String(key));
        return Array.isArray(value) ? text : `${JSON.stringify(key)}: ${text}`;
    });
    if (inline) return Array.isArray(value) ? `[${pieces.join(", ")}]` : `{ ${pieces.join(", ")} }`;
    const pad = " ".repeat(indent + 2);
    let out = Array.isArray(value) ? "[" : "{";
    keys.forEach((key, n) => {
        const orig = kidNode(key);
        const grouped = n > 0 && st && orig && st.kids.indexOf(st.kids.find(k => k.node === orig)) > 0 && (() => {
            const idx = st.kids.findIndex(k => k.node === orig);
            return idx > 0 && st.groups[idx];
        })();
        out += n === 0 ? `\n${pad}` : grouped ? ", " : `,\n${pad}`;
        out += pieces[n];
    });
    out += `\n${" ".repeat(indent)}${Array.isArray(value) ? "]" : "}"}`;
    return out;
}

//---------------------------------------------------------------------------------------------------------------
// The edits

function upsertById(list, entries) {
    for (const e of entries) {
        const at = list.findIndex(x => x.id === e.id);
        if (at >= 0) list[at] = e; else list.push(e);
    }
}
function insertKeyAfter(obj, afterKey, key, val) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) { obj[key] = val; return obj; }
    const out = {};
    for (const k of Object.keys(obj)) {
        out[k] = obj[k];
        if (k === afterKey) out[key] = val;
    }
    if (!Object.prototype.hasOwnProperty.call(out, key)) out[key] = val;
    return out;
}

function applyEdits(cat) {
    const notes = [];
    // materials, labors, combat
    cat = insertKeyAfter(cat, "items", "materials", { about: MATERIALS_ABOUT, list: MATERIALS.map(m => ({ ...m })) });
    cat = insertKeyAfter(cat, "recipes", "labors", { about: LABORS_ABOUT, list: LABORS.map(l => ({ ...l })) });
    if (cat.combat) {
        const merged = { ...COMBAT, ...cat.combat }; // theirs wins on shared keys; ours fills the rest
        for (const k of Object.keys(COMBAT)) if (!(k in cat.combat)) notes.push(`combat.${k} added next to the existing combat key`);
        cat.combat = merged;
    } else {
        cat = insertKeyAfter(cat, "colony", "combat", { ...COMBAT });
    }
    // items
    const types = cat.items.types;
    for (const id of Object.keys(EXISTING_BLOCKS)) {
        const t = types.find(x => x.id === id);
        if (!t) { notes.push(`item ${id} not in the catalog; its blocks were not added`); continue; }
        for (const k of Object.keys(EXISTING_BLOCKS[id])) if (t[k] === undefined) t[k] = EXISTING_BLOCKS[id][k];
    }
    upsertById(types, ITEMS.map(x => JSON.parse(JSON.stringify(x))));
    // recipes
    if (!cat.recipes.about.includes("Combat-chain recipes")) cat.recipes.about += RECIPES_NOTE;
    upsertById(cat.recipes.list, RECIPES.map(x => JSON.parse(JSON.stringify(x))));
    // objects
    const wb = cat.objects.find(o => o.id === "workbench");
    if (wb && !wb.tags.includes("workbench")) wb.tags.push("workbench");
    upsertById(cat.objects, OBJECTS.map(x => JSON.parse(JSON.stringify(x))));
    // wildlife yields
    for (const id of Object.keys(FEATHERS)) {
        const s = cat.wildlife.species.find(x => x.id === id);
        if (!s) { notes.push(`species ${id} not in the catalog; no feathers added`); continue; }
        s.yields = s.yields || {};
        s.yields.feathers = FEATHERS[id];
    }
    // cultures
    for (const sp of Object.keys(CULTURES)) {
        if (!cat.cultures[sp]) { notes.push(`culture ${sp} not in the catalog`); continue; }
        cat.cultures[sp].chainWeights = { ...CULTURES[sp].chainWeights };
        cat.cultures[sp].arms = JSON.parse(JSON.stringify(CULTURES[sp].arms));
    }
    // skills
    for (const s of SKILLS) if (!cat.colony.skills.includes(s)) cat.colony.skills.push(s);
    // plan steps: remove the steps this script owns, then append the variant's list
    const applyPlan = (plan, names) => {
        const kept = plan.filter(s => !OWNED_STEP_IDS.has(s.id) || (s.id === "workstone" && !names.includes("workstone")));
        // "workstone" exists in default/stone/workshop already; only the forest variant gets it from us
        const have = new Set(kept.map(s => s.id));
        for (const n of names) {
            const step = JSON.parse(JSON.stringify(STEP[n]));
            if (have.has(step.id)) continue;
            kept.push(step);
            have.add(step.id);
        }
        plan.length = 0;
        for (const s of kept) plan.push(s);
    };
    applyPlan(cat.colony.plan, PLAN_STEPS.default);
    for (const v of Object.keys(PLAN_STEPS)) {
        if (v === "default") continue;
        if (!Array.isArray(cat.colony.plans[v])) { notes.push(`plan variant ${v} not in the catalog`); continue; }
        applyPlan(cat.colony.plans[v], PLAN_STEPS[v]);
    }
    return { cat, notes };
}

//---------------------------------------------------------------------------------------------------------------
// Run: read, verify the formatter reproduces the file, edit, format, verify, write.

function main() {
    const before = fs.readFileSync(CATALOG, "utf8");
    const root = parseWithStyle(before);
    const roundTrip = format(root.value, root, 0, "expanded") + "\n";
    if (roundTrip !== before) {
        // Not fatal: the formatter must still keep untouched sections identical, which is checked below.
        let at = 0;
        while (at < before.length && before[at] === roundTrip[at]) at++;
        console.log(`note: the formatter does not reproduce the file byte for byte (first difference at offset ${at}: ${JSON.stringify(before.slice(at, at + 60))} vs ${JSON.stringify(roundTrip.slice(at, at + 60))})`);
    } else {
        console.log("PASS format.round_trip: the formatter reproduces the current catalog byte for byte");
    }
    const { cat, notes } = applyEdits(JSON.parse(before));
    const after = format(cat, root, 0, "expanded") + "\n";
    // Verify: valid JSON, equal to the edited object, and untouched top-level sections identical to the original text.
    const parsedAfter = JSON.parse(after);
    if (JSON.stringify(parsedAfter) !== JSON.stringify(cat)) { console.log("FAIL verify.equal: the formatted text does not parse back to the edited catalog"); process.exit(1); }
    const TOUCHED = new Set(["items", "materials", "recipes", "labors", "objects", "wildlife", "cultures", "colony", "combat"]);
    const beforeRoot = root, afterRoot = parseWithStyle(after);
    const sectionText = (text, node) => text.split("\n").slice(node.line0 - 1, node.line1).join("\n");
    let bad = 0;
    for (const k of beforeRoot.kids) {
        if (TOUCHED.has(k.key)) continue;
        const a = afterRoot.kids.find(x => x.key === k.key);
        const same = a && sectionText(before, k.node) === sectionText(after, a.node);
        if (!same) { bad++; console.log(`FAIL verify.untouched: top-level "${k.key}" changed although this script does not own it`); }
    }
    if (bad) process.exit(1);
    console.log(`PASS verify.untouched: ${beforeRoot.kids.length - TOUCHED.size} untouched top-level sections are byte-identical`);
    for (const n of notes) console.log(`note: ${n}`);
    const linesBefore = before.split("\n").length, linesAfter = after.split("\n").length;
    console.log(`items.types ${JSON.parse(before).items.types.length} -> ${cat.items.types.length}; recipes ${JSON.parse(before).recipes.list.length} -> ${cat.recipes.list.length}; objects ${JSON.parse(before).objects.length} -> ${cat.objects.length}; plan steps ${JSON.parse(before).colony.plan.length} -> ${cat.colony.plan.length}; lines ${linesBefore} -> ${linesAfter}`);
    if (OUT) { fs.writeFileSync(OUT, after, "utf8"); console.log(`dry copy written to ${OUT}`); }
    if (DRY) { console.log("dry run: nothing written"); return; }
    // Re-read immediately before writing: another agent may have saved the file while this ran.
    const latest = fs.readFileSync(CATALOG, "utf8");
    if (latest !== before) {
        console.log("note: the catalog changed on disk while this script ran; applying the edits to the latest text");
        const root2 = parseWithStyle(latest);
        const { cat: cat2 } = applyEdits(JSON.parse(latest));
        fs.writeFileSync(CATALOG, format(cat2, root2, 0, "expanded") + "\n", "utf8");
    } else {
        fs.writeFileSync(CATALOG, after, "utf8");
    }
    console.log(`wrote ${CATALOG}`);
}

main();
