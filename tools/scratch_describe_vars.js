'use strict';
const fs = require('fs');
const { decodePNG } = require('./png_read');

const maleVars = [
    'Forester / Hunter (brown leather jerkin, linen shirt)',
    'Iron Guard / Knight (steel plate cuirass, dark mail)',
    'Blacksmith / Artisan (heavy leather apron, grey tunic)',
    'Townsman / Merchant (green doublet, leather belt)',
    'Scout / Ranger (hooded cloak, light jerkin)',
    'Elder / Sage (simple linen tunic, belt)'
];

const femaleVars = [
    'Townswoman / Peasant (russet dress, white apron)',
    'Huntress / Forester (green forester tunic, brown boots)',
    'Artisan / Weaver (indigo work dress, leather sash)',
    'Guard / Scout (leather armor, arm bracers)',
    'Scholar / Herbalist (teal robe, leather pouch)',
    'Elder / Matron (grey-blue dress, shawl)'
];

console.log('Human Male Variations (1..6):');
maleVars.forEach((desc, i) => console.log(`  Var ${i + 1}: ${desc}`));

console.log('\nHuman Female Variations (1..6):');
femaleVars.forEach((desc, i) => console.log(`  Var ${i + 1}: ${desc}`));
