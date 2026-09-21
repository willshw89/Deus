const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8'));
const objs = cat.objects || [];
console.log('chest_wood:', JSON.stringify(objs.find(x => x.id === 'chest_wood'), null, 2));
console.log('kitchen_pantry:', JSON.stringify(objs.find(x => x.id === 'kitchen_pantry'), null, 2));
