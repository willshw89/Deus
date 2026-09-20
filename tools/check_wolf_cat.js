const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8'));
console.log('cat.wildlife is:', typeof cat.wildlife);
if (cat.wildlife) {
    console.log('cat.wildlife.species length:', cat.wildlife.species.length);
    const wolf = cat.wildlife.species.find(s => s.id === 'wolf');
    console.log('wolf:', wolf);
}
// Search all string keys/values for wolf
const rawText = fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8');
const pos = rawText.indexOf('"id": "wild_sheep"');
if (pos !== -1) {
    const lineNum = rawText.substring(0, pos).split('\n').length;
    console.log('Sheep line number:', lineNum);
    console.log('Substring around sheep:', rawText.substring(pos, pos + 120));
}
