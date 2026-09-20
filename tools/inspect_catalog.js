const fs = require('fs');
const path = require('path');

const catPath = path.join(__dirname, '..', 'game', 'data', 'UF_WorldCatalog.json');
const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));

console.log('Top-level keys:', Object.keys(cat));
console.log('Biomes keys:', Object.keys(cat.biomes || {}));
console.log('Sample biome (forest):', JSON.stringify(cat.biomes?.temperate_forest || cat.biomes?.forest, null, 2));

const wallObjects = Object.entries(cat.objects || {})
  .filter(([k, v]) => k.includes('wall'))
  .map(([k, v]) => ({ id: k, actions: v.actions, drops: v.drops }));
console.log('Wall objects:', wallObjects);

const plantObjects = Object.entries(cat.objects || {})
  .filter(([k, v]) => v.family === 'flora' || v.kind === 'plant' || v.kind === 'tree' || k.includes('flower') || k.includes('shrub') || k.includes('mushroom'))
  .map(([k, v]) => ({ id: k, kind: v.kind, name: v.name, actions: v.actions }));
console.log('Sample plant objects:', plantObjects.slice(0, 10));

console.log('Wildlife keys:', Object.keys(cat.wildlife?.species || {}));

