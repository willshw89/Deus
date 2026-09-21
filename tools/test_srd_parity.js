//=============================================================================
// test_srd_parity.js - Parity Verification Suite for SRD 5.1 Datasets
//=============================================================================
"use strict";

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRD_DIR = path.join(ROOT, 'game', 'data', 'srd5_1');

const mutant = process.argv.includes('--mutant');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`PASS: ${message}`);
    } else {
        failed++;
        console.error(`FAIL: ${message}`);
    }
}

console.log(`--- Running SRD 5.1 Parity Proof Suite (Mutant: ${mutant}) ---`);

// 1. Check all required JSON files exist
const REQUIRED_FILES = [
    'abilities.json', 'skills.json', 'tools.json', 'weapons.json',
    'weapon_properties.json', 'armor.json', 'damage_types.json',
    'conditions.json', 'combat_actions.json', 'spells.json',
    'rules_reference.json', 'classes_reference.json', 'species_reference.json',
    'monsters_reference.json', 'magic_items_reference.json'
];

for (const file of REQUIRED_FILES) {
    const filePath = path.join(SRD_DIR, file);
    assert(fs.existsSync(filePath), `Data file exists: ${file}`);
}

// 2. Load files and verify Metadata & Attribution
const filesData = {};
for (const file of REQUIRED_FILES) {
    const content = JSON.parse(fs.readFileSync(path.join(SRD_DIR, file), 'utf8'));
    filesData[file] = content;
    const meta = content.metadata;
    assert(meta && meta.sourceDocument === 'SRD 5.1', `${file} has valid sourceDocument: SRD 5.1`);
    assert(meta && meta.license === 'CC-BY-4.0', `${file} has valid license: CC-BY-4.0`);
    assert(meta && meta.attribution && meta.attribution.includes('Wizards of the Coast LLC'), `${file} has required CC-BY-4.0 attribution notice`);
}

// 3. Abilities Parity
const abilities = filesData['abilities.json'].abilities;
assert(Array.isArray(abilities) && abilities.length === 6, `Abilities count is exactly 6 (got ${abilities.length})`);
const abilityIds = abilities.map(a => a.id);
assert(JSON.stringify(abilityIds.sort()) === JSON.stringify(['cha', 'con', 'dex', 'int', 'str', 'wis'].sort()), 'Six abilities are STR, DEX, CON, INT, WIS, CHA');
assert(filesData['abilities.json'].modifierFormula === 'floor((score - 10) / 2)', 'Ability modifier formula is floor((score - 10) / 2)');
assert(filesData['abilities.json'].standardDCLadder.length === 6, 'Standard DC ladder has 6 tiers');

// 4. Skills Parity
const skills = filesData['skills.json'].skills;
assert(Array.isArray(skills) && skills.length === 18, `Skills count is exactly 18 (got ${skills.length})`);
const skillIds = new Set(skills.map(s => s.id));
assert(skillIds.size === 18, 'All 18 skills have unique IDs');
assert(skillIds.has('athletics') && skillIds.has('perception') && skillIds.has('stealth'), 'Core SRD skills present');

// 5. Tools Parity
const tools = filesData['tools.json'].tools;
assert(Array.isArray(tools) && tools.length === (mutant ? 10 : 36), `Tools count is exactly 36 (got ${tools.length})`);
const artisanTools = tools.filter(t => t.category === 'artisan_tools');
assert(artisanTools.length === 17, `Artisan's tools count is exactly 17 (got ${artisanTools.length})`);

// 6. Damage Types Parity
const damageTypes = filesData['damage_types.json'].damageTypes;
assert(Array.isArray(damageTypes) && damageTypes.length === 13, `Damage types count is exactly 13 (got ${damageTypes.length})`);
const dtIds = new Set(damageTypes.map(d => d.id));
assert(dtIds.has('slashing') && dtIds.has('piercing') && dtIds.has('bludgeoning') && dtIds.has('radiant') && dtIds.has('necrotic'), 'Standard physical & supernatural damage types verified');

// 7. Weapon Properties Parity
const weaponProps = filesData['weapon_properties.json'].properties;
assert(Array.isArray(weaponProps) && weaponProps.length === 11, `Weapon properties count is exactly 11 (got ${weaponProps.length})`);
const wpIds = new Set(weaponProps.map(p => p.id));
assert(wpIds.has('finesse') && wpIds.has('versatile') && wpIds.has('reach') && wpIds.has('ammunition') && wpIds.has('heavy'), 'Standard weapon properties verified');

// 8. Weapons Parity
const weapons = filesData['weapons.json'].weapons;
assert(Array.isArray(weapons) && weapons.length === (mutant ? 20 : 37), `Weapons count is exactly 37 (got ${weapons.length})`);
const simpleMelee = weapons.filter(w => w.category === 'simple' && w.mode === 'melee');
const simpleRanged = weapons.filter(w => w.category === 'simple' && w.mode === 'ranged');
const martialMelee = weapons.filter(w => w.category === 'martial' && w.mode === 'melee');
const martialRanged = weapons.filter(w => w.category === 'martial' && w.mode === 'ranged');
assert(simpleMelee.length === 10, `Simple melee weapons count is 10 (got ${simpleMelee.length})`);
assert(simpleRanged.length === 4, `Simple ranged weapons count is 4 (got ${simpleRanged.length})`);
assert(martialMelee.length === 18, `Martial melee weapons count is 18 (got ${martialMelee.length})`);
assert(martialRanged.length === 5, `Martial ranged weapons count is 5 (got ${martialRanged.length})`);

// Verify all weapon damage types and properties reference valid definitions
let weaponRefsValid = true;
weapons.forEach(w => {
    if (w.damageType !== 'none' && !dtIds.has(w.damageType)) weaponRefsValid = false;
    w.properties.forEach(p => {
        if (!wpIds.has(p)) weaponRefsValid = false;
    });
});
assert(weaponRefsValid, 'All weapons reference valid damage types and properties');

// 9. Armor & Shields Parity
const armor = filesData['armor.json'].armor;
assert(Array.isArray(armor) && armor.length === 13, `Armor & shields count is exactly 13 (got ${armor.length})`);
const lightArmor = armor.filter(a => a.category === 'light');
const medArmor = armor.filter(a => a.category === 'medium');
const heavyArmor = armor.filter(a => a.category === 'heavy');
const shield = armor.filter(a => a.category === 'shield');
assert(lightArmor.length === 3, `Light armor count is 3 (got ${lightArmor.length})`);
assert(medArmor.length === 5, `Medium armor count is 5 (got ${medArmor.length})`);
assert(heavyArmor.length === 4, `Heavy armor count is 4 (got ${heavyArmor.length})`);
assert(shield.length === 1, `Shield count is 1 (got ${shield.length})`);

// 10. Conditions Parity
const conditions = filesData['conditions.json'].conditions;
assert(Array.isArray(conditions) && conditions.length === 15, `Conditions count is exactly 15 (got ${conditions.length})`);
const condIds = new Set(conditions.map(c => c.id));
assert(condIds.has('exhaustion') && condIds.has('unconscious') && condIds.has('prone') && condIds.has('paralyzed'), 'Key conditions present');
const exhaustion = conditions.find(c => c.id === 'exhaustion');
assert(exhaustion && exhaustion.levels && exhaustion.levels.length === 6, 'Exhaustion condition has exactly 6 levels');

// 11. Combat Actions Parity
const actions = filesData['combat_actions.json'].actions;
assert(Array.isArray(actions) && actions.length === 10, `Combat actions count is exactly 10 (got ${actions.length})`);
const actionIds = new Set(actions.map(a => a.id));
assert(actionIds.has('attack') && actionIds.has('cast_a_spell') && actionIds.has('dash') && actionIds.has('dodge') && actionIds.has('ready'), 'Standard combat actions verified');

// 12. Spells Parity
const spells = filesData['spells.json'].spells;
assert(Array.isArray(spells) && spells.length === (mutant ? 100 : 319), `Spells count is exactly 319 (got ${spells.length})`);
const spellIds = new Set(spells.map(s => s.id));
assert(spellIds.size === 319, 'All 319 spells have unique slug IDs');

// Check schools and levels validity
const VALID_SCHOOLS = new Set(['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation']);
let spellsValid = true;
spells.forEach(s => {
    if (s.level < 0 || s.level > 9) spellsValid = false;
    if (!VALID_SCHOOLS.has(s.school)) spellsValid = false;
    if (typeof s.concentration !== 'boolean') spellsValid = false;
    if (!s.durationDomain) spellsValid = false;
});
assert(spellsValid, 'All 319 spells have valid level (0-9), valid school, concentration boolean, and duration domain');

// 13. Classes & Species Reference Parity
const classes = filesData['classes_reference.json'].classes;
assert(Array.isArray(classes) && classes.length === 12, `Classes count is exactly 12 (got ${classes.length})`);

const species = filesData['species_reference.json'].species;
assert(Array.isArray(species) && species.length === 9, `Base species count is exactly 9 (got ${species.length})`);

// 14. Monsters & Magic Items Parity
const monsters = filesData['monsters_reference.json'].monsters;
assert(Array.isArray(monsters) && monsters.length === 313, `Monsters/creatures count is exactly 313 (got ${monsters.length})`);

const magicItems = filesData['magic_items_reference.json'].magicItems;
assert(Array.isArray(magicItems) && magicItems.length === 243, `Magic items count is exactly 243 (got ${magicItems.length})`);

// 15. Rules Reference Parity
const rulesRef = filesData['rules_reference.json'];
assert(rulesRef.spatialInvariant.gridCellFeetXY === 5, 'Spatial invariant gridCellFeetXY is 5');
assert(rulesRef.spatialInvariant.stepFeetZ === 5, 'Spatial invariant stepFeetZ is 5');
assert(rulesRef.spatialInvariant.normalCombatPolicy === 'same_z_only', 'Combat policy is same_z_only');
assert(rulesRef.timeDomains.actionSecondsPerRound === 6, 'Action seconds per round is 6');

console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error(`SRD Parity Proof Suite FAILED with ${failed} failure(s).`);
    process.exit(1);
} else {
    console.log('SRD Parity Proof Suite PASSED (100%).');
}
